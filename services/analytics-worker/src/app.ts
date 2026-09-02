import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttpMiddleware } from './middleware/logger';
import analyticsRoutes from './routes/analytics';

export const createApp = (): Express => {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use((req, res, next) => {
    const requestId = (req.headers['x-request-id'] as string) || `analytics-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    (req as any).requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  });
  app.use(pinoHttpMiddleware);

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'UP', service: 'analytics-worker', timestamp: new Date().toISOString() });
  });

  app.get('/ready', (_req, res) => {
    res.status(200).json({ status: 'READY', service: 'analytics-worker', timestamp: new Date().toISOString() });
  });

  app.use('/', analyticsRoutes);

  return app;
};
