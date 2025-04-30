import { Test, TestingModule } from '@nestjs/testing';
import { UserNotificationController } from './user-notification.controller';
import { UserNotificationService } from './user-notification.service';

describe('UserNotificationController', () => {
  let controller: UserNotificationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserNotificationController],
      providers: [UserNotificationService],
    }).compile();

    controller = module.get<UserNotificationController>(UserNotificationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
