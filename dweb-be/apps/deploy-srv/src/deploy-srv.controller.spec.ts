import { Test, TestingModule } from '@nestjs/testing';
import { DeploySrvController } from './deploy-srv.controller';
import { DeploySrvService } from './deploy-srv.service';

describe('DeploySrvController', () => {
  let deploySrvController: DeploySrvController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [DeploySrvController],
      providers: [DeploySrvService],
    }).compile();

    deploySrvController = app.get<DeploySrvController>(DeploySrvController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(deploySrvController.getHello()).toBe('Hello World!');
    });
  });
});
