import { z } from 'zod';
import { sessionTokensSchema } from '../../lib/session';

/**
 * Only the fields the UI actually uses. Zod strips anything else, so the app cannot quietly
 * come to depend on a field that was never declared here.
 */
export const authUserSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  image: z.string(),
});

/** Signing in returns the user and the token pair in one flat object. */
export const loginResponseSchema = authUserSchema.extend(sessionTokensSchema.shape);

export type AuthUser = z.infer<typeof authUserSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
