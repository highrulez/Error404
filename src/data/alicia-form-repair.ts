/**
 * Admin repair — delegates to idempotent ensureAliciaOnboardingDemoData.
 * Preserves form answers and completed outcomes.
 */

import type { UnitOfWork } from "./repositories/interfaces";
import type { UserSession } from "./auth-types";
import {
  ensureAliciaOnboardingDemoData,
  repairAliciaOnboardingJourney,
} from "./ensure-alicia-onboarding";

/** @deprecated Prefer repairAliciaOnboardingJourney / ensureAliciaOnboardingDemoData */
export function repairAliciaOnboardingForms(
  uow: UnitOfWork,
  session: UserSession
): { ok: true; message: string } | { ok: false; error: string } {
  const result = repairAliciaOnboardingJourney(uow, session);
  if (!result.ok) return result;
  return { ok: true, message: result.message };
}

export { ensureAliciaOnboardingDemoData, repairAliciaOnboardingJourney };
