// src/app.ts
import express from 'express';
import cors from 'cors';
import { logger } from './utils/logger';
import authRoutes       from '../src/routes/auth';
import userRoutes       from '../src/routes/users';
import departmentRoutes from '../src/routes/departments';
import endorseRoutes    from './routes/endorse';
import dutyRoutes       from '../src/routes/dutyRequests';
import messengerRouter  from './routes/messengerWebhook';
import joRoutes         from './routes/jo';
import sseRoutes        from './routes/sse';

const app = express();

app.use(cors({ origin: 'http://localhost:4200' }));
app.use(express.json());

app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', departmentRoutes);
app.use('/api', sseRoutes);      // ← SSE before dutyRoutes
app.use('/api', dutyRoutes);
app.use('/api', messengerRouter);
app.use('/api', joRoutes);
app.use('/api', endorseRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(err.message, { stack: err.stack });
  res.status(err.statusCode || 500).json({ error: err.message || 'Internal Server Error' });
});

export default app;