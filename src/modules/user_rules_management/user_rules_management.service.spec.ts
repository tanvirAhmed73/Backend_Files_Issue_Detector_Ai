import { Test, TestingModule } from '@nestjs/testing';
import { UserRulesManagementService } from './user_rules_management.service';

describe('UserRulesManagementService', () => {
  let service: UserRulesManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserRulesManagementService],
    }).compile();

    service = module.get<UserRulesManagementService>(UserRulesManagementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
