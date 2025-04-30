import { Test, TestingModule } from '@nestjs/testing';
import { UserRulesManagementController } from './user_rules_management.controller';
import { UserRulesManagementService } from './user_rules_management.service';

describe('UserRulesManagementController', () => {
  let controller: UserRulesManagementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserRulesManagementController],
      providers: [UserRulesManagementService],
    }).compile();

    controller = module.get<UserRulesManagementController>(UserRulesManagementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
