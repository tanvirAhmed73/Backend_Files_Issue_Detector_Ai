import { Test, TestingModule } from '@nestjs/testing';
import { UserSupportController } from './user-support.controller';
import { UserSupportService } from './user-support.service';

describe('UserSupportController', () => {
  let controller: UserSupportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserSupportController],
      providers: [UserSupportService],
    }).compile();

    controller = module.get<UserSupportController>(UserSupportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
