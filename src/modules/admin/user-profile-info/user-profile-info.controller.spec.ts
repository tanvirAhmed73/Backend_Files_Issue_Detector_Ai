import { Test, TestingModule } from '@nestjs/testing';
import { UserProfileInfoController } from './user-profile-info.controller';
import { UserProfileInfoService } from './user-profile-info.service';

describe('UserProfileInfoController', () => {
  let controller: UserProfileInfoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserProfileInfoController],
      providers: [UserProfileInfoService],
    }).compile();

    controller = module.get<UserProfileInfoController>(UserProfileInfoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
