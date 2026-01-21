import 'reflect-metadata';
import { Controller, CONTROLLER_METADATA } from './controller.decorator';


describe('Controller decorator', () => {
  it('should define controller metadata', () => {
    @Controller('/users')
    class UserController { }

    const path = Reflect.getMetadata(CONTROLLER_METADATA, UserController);
    expect(path).toBe('/users');
  });
});
