import { Test, TestingModule } from '@nestjs/testing';
import { RuleManagementService } from './rule-management.service';

describe('RuleManagementService', () => {
  let service: RuleManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RuleManagementService],
    }).compile();

    service = module.get<RuleManagementService>(RuleManagementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
