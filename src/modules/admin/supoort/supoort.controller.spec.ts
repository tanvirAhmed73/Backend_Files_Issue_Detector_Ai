import { Test, TestingModule } from '@nestjs/testing';
import { SupoortController } from './supoort.controller';
import { SupoortService } from './supoort.service';

describe('SupoortController', () => {
  let controller: SupoortController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupoortController],
      providers: [SupoortService],
    }).compile();

    controller = module.get<SupoortController>(SupoortController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
