import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { Request } from 'express';
import { tenantRequestContext } from './tenant-context.js';

interface TenantRequest extends Request {
  user?: { hospitalId?: string };
}

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const hospitalId = request.user?.hospitalId;
    if (!hospitalId) return next.handle();
    return new Observable((subscriber) =>
      tenantRequestContext.run({ hospitalId }, () =>
        next.handle().subscribe(subscriber),
      ),
    );
  }
}

