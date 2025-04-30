import { Test, TestingModule } from '@nestjs/testing';
import { UserNotificationService } from './user-notification.service';

describe('UserNotificationService', () => {
  let service: UserNotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserNotificationService],
    }).compile();

    service = module.get<UserNotificationService>(UserNotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
