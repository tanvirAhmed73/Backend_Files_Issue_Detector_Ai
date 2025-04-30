import { Test, TestingModule } from '@nestjs/testing';
import { AnalyzerInterfaceService } from './analyzer_interface.service';

describe('AnalyzerInterfaceService', () => {
  let service: AnalyzerInterfaceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnalyzerInterfaceService],
    }).compile();

    service = module.get<AnalyzerInterfaceService>(AnalyzerInterfaceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
