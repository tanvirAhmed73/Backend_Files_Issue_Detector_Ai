import { Test, TestingModule } from '@nestjs/testing';
import { UserSupportService } from './user-support.service';

describe('UserSupportService', () => {
  let service: UserSupportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserSupportService],
    }).compile();

    service = module.get<UserSupportService>(UserSupportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
