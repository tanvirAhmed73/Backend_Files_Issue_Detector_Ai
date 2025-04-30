import { Test, TestingModule } from '@nestjs/testing';
import { RuleManagementController } from './rule-management.controller';
import { RuleManagementService } from './rule-management.service';

describe('RuleManagementController', () => {
  let controller: RuleManagementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RuleManagementController],
      providers: [RuleManagementService],
    }).compile();

    controller = module.get<RuleManagementController>(RuleManagementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
