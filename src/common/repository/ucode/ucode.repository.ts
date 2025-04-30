import { PrismaClient } from '@prisma/client';
import { DateHelper } from '../../../common/helper/date.helper';
import { v4 as uuid } from 'uuid';
import { UserRepository } from '../user/user.repository';
import { randomInt } from 'crypto';
import crypto from 'crypto';

const prisma = new PrismaClient();

export class UcodeRepository {
  /**
   * create ucode token
   * @returns
   */
  static async createToken({
    userId,
    expired_at = null,
    isOtp = false,
    email = null,
  }): Promise<string> {
    // OTP valid for 5 minutes
    const otpExpiryTime = 5 * 60 * 1000;
    expired_at = new Date(Date.now() + otpExpiryTime);

    const userDetails = await UserRepository.getUserDetails(userId);
    if (userDetails && userDetails.email) {
      let token: string;
      if (isOtp) {
        // create 6 digit otp code
        // token = String(Math.floor(100000 + Math.random() * 900000));
        token = String(randomInt(100000, 1000000));
      } else {
        token = uuid();
      }
      const data = await prisma.ucode.create({
        data: {
          user_id: userId,
          token: token,
          email: email ?? userDetails.email,
          expired_at: expired_at,
        },
      });
      return data.token;
    } else {
      return null;
    }
  }

  /**
   * validate ucode token
   * @returns
   */
  static async validateToken({
    email,
    token,
    forEmailChange = false,
  }: {
    email: string;
    token: string;
    forEmailChange?: boolean;
  }) {
    const userDetails = await UserRepository.exist({
      field: 'email',
      value: email,
    });

    let proceedNext = false;
    if (forEmailChange == true) {
      proceedNext = true;
    } else {
      if (userDetails && userDetails.email) {
        proceedNext = true;
      }
    }

    if (proceedNext) {
      const date = DateHelper.now().toISOString();
      const existToken = await prisma.ucode.findFirst({
        where: {
          AND: {
            token: token,
            email: email,
          },
        },
      });

      if (existToken) {
        if (existToken.expired_at) {
          const data = await prisma.ucode.findFirst({
            where: {
              AND: [
                {
                  token: token,
                },
                {
                  email: email,
                },
                {
                  expired_at: {
                    gte: date,
                  },
                },
              ],
            },
          });
          if (data) {
            // delete this token
            // await prisma.ucode.delete({
            //   where: {
            //     id: data.id,
            //   },
            // });
            return true;
          } else {
            return false;
          }
        } else {
          // delete this token
          await prisma.ucode.delete({
            where: {
              id: existToken.id,
            },
          });
          return true;
        }
      }
    } else {
      return false;
    }
  }

  /**
   * delete ucode token
   * @returns
   */
  static async deleteToken({ email, token }) {
    await prisma.ucode.deleteMany({
      where: {
        AND: [{ email: email }, { token: token }],
      },
    });
  }

  static async createVerificationToken(params: {
    userId: string;
    email: string;
  }) {
    try {
      const token = crypto.randomBytes(32).toString('hex');

      const ucode = await prisma.ucode.create({
        data: {
          user_id: params.userId,
          email: params.email,
          token: token,
          expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          status: 1,
        },
      });

      return ucode;
    } catch (error) {
      return null;
    }
  }
}
