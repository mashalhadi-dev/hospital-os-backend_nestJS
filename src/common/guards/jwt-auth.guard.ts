import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient, type Role } from '@prisma/client';
import type { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  role: Role;
  hospitalId: string;
}

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const [scheme, token, extra] = authorization?.split(' ') ?? [];

    if (scheme?.toLowerCase() !== 'bearer' || !token || extra !== undefined) {
      throw new UnauthorizedException('A valid bearer token is required');
    }

    let claims: { sub?: unknown };
    try {
      claims = await this.jwtService.verifyAsync<{ sub?: unknown }>(token, {
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired bearer token');
    }

    if (typeof claims.sub !== 'string' || !uuidPattern.test(claims.sub)) {
      throw new UnauthorizedException('Invalid bearer token subject');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: claims.sub },
      select: { id: true, role: true, hospitalId: true },
    });
    if (!user) {
      throw new UnauthorizedException('Authenticated user no longer exists');
    }

    request.user = user;
    return true;
  }
}
