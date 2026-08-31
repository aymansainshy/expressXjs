import { Controller } from './controller';
import { CONTROLLER_METADATA } from '../common'


describe('Controller decorator', () => {
  it('should define controller metadata', () => {
    @Controller('/users')
    class UserController { }

    const path = Reflect.getMetadata(CONTROLLER_METADATA, UserController);
    expect(path).toBe('/users');
  });
});
