import { Test, TestingModule } from '@nestjs/testing';
import { AnalyzerInterfaceController } from './analyzer_interface.controller';
import { AnalyzerInterfaceService } from './analyzer_interface.service';

describe('AnalyzerInterfaceController', () => {
  let controller: AnalyzerInterfaceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyzerInterfaceController],
      providers: [AnalyzerInterfaceService],
    }).compile();

    controller = module.get<AnalyzerInterfaceController>(AnalyzerInterfaceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
