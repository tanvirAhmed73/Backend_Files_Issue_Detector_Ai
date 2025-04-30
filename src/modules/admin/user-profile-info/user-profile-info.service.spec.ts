import { Test, TestingModule } from '@nestjs/testing';
import { UserProfileInfoService } from './user-profile-info.service';

describe('UserProfileInfoService', () => {
  let service: UserProfileInfoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserProfileInfoService],
    }).compile();

    service = module.get<UserProfileInfoService>(UserProfileInfoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
