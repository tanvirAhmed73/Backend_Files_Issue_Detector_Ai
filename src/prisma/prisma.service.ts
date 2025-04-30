// external imports
import {
  // INestApplication,
  Logger,
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
// internal imports
import { SoftdeleteMiddleware } from './middleware/softdelete.middleware';

@Injectable()
// export class PrismaService extends PrismaClient implements OnModuleInit {
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, 'query'>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({ log: [{ emit: 'event', level: 'query' }] });

    // this.logger.log(`Prisma v${Prisma.prismaVersion.client}`);
    // dfd
    // this.$on('query', (e) => this.logger.debug(`${e.query} ${e.params}`));

    // comment out this when seeding data using command line
    if (process.env.PRISMA_ENV == '1') {
    } else {
      // use middleware here
      this.$use(SoftdeleteMiddleware);
    }
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // async enableShutdownHooks(app: INestApplication) {
  //   this.$on('beforeExit', async () => {
  //     await app.close();
  //   });
  // }
}
