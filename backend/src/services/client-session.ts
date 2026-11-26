import type { PlanTier } from '@mrrokesh/shared';
import type { AppDeps } from '../app-deps';
import type { SessionBody } from './auth';

export type ClientUser = SessionBody['user'] & {
  name: string;
  organization: string;
  plan: PlanTier;
  isOperator: boolean;
};

export interface ClientSession extends Omit<SessionBody, 'user'> {
  user: ClientUser;
}

/** Adds the web client fields without removing the control-plane user fields. */
export async function withClientUser(deps: AppDeps, session: SessionBody): Promise<ClientSession> {
  const subscription = await deps.store.findSubscription(session.organization.id);
  const plan = subscription ? await deps.store.findPlanById(subscription.planId) : null;
  const isOperator = deps.config.operatorEmails.includes(session.user.email.toLowerCase());
  return {
    ...session,
    user: {
      ...session.user,
      name: session.user.fullName,
      organization: session.organization.name,
      plan: plan?.tier ?? 'free',
      isOperator,
    },
  };
}

/**
 * Signup keeps `session` for the control plane and repeats the token pair at
 * the top level so the mobile client can read it.
 */
export function flattenSignup(session: ClientSession, syncStatus: 'synced' | 'pending') {
  return {
    session,
    syncStatus,
    tokenType: session.tokenType,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresIn: session.expiresIn,
    user: session.user,
    organization: session.organization,
  };
}
