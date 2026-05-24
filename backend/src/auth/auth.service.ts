// auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

// Simple admin auth - replace with DB users in production
const ADMIN_USER = {
  id: 'admin',
  username: 'admin',
};

@Injectable()
export class AuthService {
  constructor(
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(username: string, password: string) {
    const adminPass = this.config.get('ADMIN_PASSWORD', 'admin123');
    if (username === 'admin' && password === adminPass) {
      const token = this.jwt.sign({ sub: ADMIN_USER.id, username: ADMIN_USER.username });
      return { access_token: token, user: ADMIN_USER };
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  validateUser(payload: any) {
    return { id: payload.sub, username: payload.username };
  }
}
