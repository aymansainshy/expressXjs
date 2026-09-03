import { Request } from '@expressxjs/core';
import { Guard } from '@expressxjs/core';

export class JWTAuthGuard extends Guard {
  canActivate(req: Request): Promise<boolean> | boolean {
    return new Promise((resolve, reject) => {
      const authHeader = req.headers['authorization'];

      // Simulate token validation (replace with real validation logic)
      if (authHeader) {
        console.log('Token is valid');
        return resolve(true);
      } else {
        console.log('Invalid token');
        return resolve(false);
      }
    });
  }
}
