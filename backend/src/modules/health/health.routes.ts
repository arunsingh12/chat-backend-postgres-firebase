import { Router } from 'express';
import type { HealthCheck } from '../../container.js';

/** Liveness at GET /health, readiness (dependencies) at GET /health/ready. */
export const createHealthRouter = (checks: HealthCheck[]) => {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json({ status: 'ok', uptime: Math.round(process.uptime()) });
  });

  router.get('/ready', async (_req, res) => {
    const results = await Promise.all(
      checks.map(async ({ name, check }) => {
        try {
          await check();
          return [name, 'up'] as const;
        } catch {
          return [name, 'down'] as const;
        }
      }),
    );
    const ready = results.every(([, status]) => status === 'up');
    res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'degraded',
      dependencies: Object.fromEntries(results),
    });
  });

  return router;
};
