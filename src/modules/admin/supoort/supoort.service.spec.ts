import { Test, TestingModule } from '@nestjs/testing';
import { SupoortService } from './supoort.service';

describe('SupoortService', () => {
  let service: SupoortService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SupoortService],
    }).compile();

    service = module.get<SupoortService>(SupoortService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
