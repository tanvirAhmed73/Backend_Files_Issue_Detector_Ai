import { Test, TestingModule } from '@nestjs/testing';
import { ApiManagementService } from './api-management.service';

describe('ApiManagementService', () => {
  let service: ApiManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApiManagementService],
    }).compile();

    service = module.get<ApiManagementService>(ApiManagementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
