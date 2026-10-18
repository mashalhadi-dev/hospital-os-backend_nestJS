import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantRequestContext {
  hospitalId: string;
}

export const tenantRequestContext = new AsyncLocalStorage<TenantRequestContext>();

