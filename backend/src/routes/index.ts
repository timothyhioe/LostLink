import { Router } from 'express';

import { healthRouter } from './health.routes';
import authRouter from './auth';

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use('/auth', authRouter);

