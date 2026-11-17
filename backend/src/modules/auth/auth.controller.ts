import { handler, send } from '../../common/http/handler.js';
import { currentUserId } from '../../common/http/identity.js';
import { loginBody, registerBody } from './auth.schemas.js';
import type { AuthService } from './auth.service.js';

export const createAuthController = (auth: AuthService) => ({
  /** POST /auth/register */
  register: handler({ body: registerBody }, async ({ body }, res) => {
    send(res, await auth.register(body), 201);
  }),

  /** POST /auth/login */
  login: handler({ body: loginBody }, async ({ body }, res) => {
    send(res, await auth.login(body.email, body.password));
  }),

  /** GET /auth/me */
  me: handler({}, async (_input, res, req) => {
    send(res, await auth.me(currentUserId(req)));
  }),
});
