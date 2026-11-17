import type { Request, RequestHandler, Response } from 'express';
import type { z } from 'zod';
import { AppError } from '../errors/app-error.js';

interface RequestSchema {
  params?: z.ZodType;
  query?: z.ZodType;
  body?: z.ZodType;
}

type Infer<S extends RequestSchema, K extends keyof RequestSchema> = S[K] extends z.ZodType
  ? z.infer<S[K]>
  : undefined;

export interface ValidatedInput<S extends RequestSchema> {
  params: Infer<S, 'params'>;
  query: Infer<S, 'query'>;
  body: Infer<S, 'body'>;
}

interface ValidationIssue {
  location: keyof RequestSchema;
  path: string;
  message: string;
}

const LOCATIONS = ['params', 'query', 'body'] as const;

/**
 * Builds a strictly typed Express handler: params / query / body are validated
 * against zod schemas and handed to the controller already parsed. Express 5
 * forwards rejected promises to the error middleware, so no try/catch needed.
 */
export const handler =
  <S extends RequestSchema>(
    schema: S,
    fn: (input: ValidatedInput<S>, res: Response, req: Request) => Promise<unknown>,
  ): RequestHandler =>
  async (req, res) => {
    const issues: ValidationIssue[] = [];
    const parsed: Partial<Record<keyof RequestSchema, unknown>> = {};

    for (const location of LOCATIONS) {
      const locationSchema = schema[location];
      if (!locationSchema) continue;

      const result = locationSchema.safeParse(req[location] ?? {});
      if (result.success) {
        parsed[location] = result.data;
        continue;
      }
      for (const issue of result.error.issues) {
        issues.push({ location, path: issue.path.join('.'), message: issue.message });
      }
    }

    if (issues.length > 0) throw AppError.validation(issues);

    await fn(parsed as ValidatedInput<S>, res, req);
  };

export const send = <T>(res: Response, data: T, status = 200) => {
  res.status(status).json({ data });
};
