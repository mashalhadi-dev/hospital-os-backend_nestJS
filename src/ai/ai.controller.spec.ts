import { Role } from '@prisma/client';
import { AiController } from './ai.controller.js';
import { ROLES_KEY } from '../common/decorators/roles.decorator.js';

describe('AiController role scopes', () => {
  it('limits nursing AI to nurses and receptionist AI to receptionists', () => {
    expect(getMethodRoles('nurseCopilot')).toEqual([Role.NURSE]);
    expect(getMethodRoles('receptionistCopilot')).toEqual([
      Role.RECEPTIONIST,
    ]);
  });
});

function getMethodRoles(
  methodName: 'nurseCopilot' | 'receptionistCopilot',
): Role[] | undefined {
  const method = Object.getOwnPropertyDescriptor(
    AiController.prototype,
    methodName,
  )?.value;
  if (typeof method !== 'function') {
    throw new Error(`AI controller method ${methodName} is not defined`);
  }
  return Reflect.getMetadata(ROLES_KEY, method);
}
