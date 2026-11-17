import { z } from 'zod';
import { uuid } from '../../common/http/schemas.js';

export const userParams = z.object({ userId: uuid('userId') });
