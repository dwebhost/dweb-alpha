import { Test, TestingModule } from '@nestjs/testing';
import { PinningSrvController } from './pinning-srv.controller';
import { PinningSrvService } from './pinning-srv.service';

describe('PinningSrvController', () => {
  let pinningSrvController: PinningSrvController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [PinningSrvController],
      providers: [PinningSrvService],
    }).compile();

    pinningSrvController = app.get<PinningSrvController>(PinningSrvController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(pinningSrvController.getHello()).toBe('Hello World!');
    });
  });
});
