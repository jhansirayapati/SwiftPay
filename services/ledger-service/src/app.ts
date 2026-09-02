import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { pinoHttpMiddleware } from './middleware/logger';
import { setupErrorHandling } from './middleware/errorHandler';
import transactionRoutes from './routes/transactions';

export const createApp = (): Express => {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Logging
  app.use((req, res, next) => {
    const requestId = (req.headers['x-request-id'] as string) || `ledger-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    (req as any).requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  });
  app.use(pinoHttpMiddleware);

  // Swagger documentation
  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'SwiftPay Ledger Service API',
        version: '0.1.0',
        description:
          'Real-time payment settlement and transaction history',
        contact: {
          name: 'SwiftPay',
        },
      },
      servers: [
        {
          url: 'http://localhost:3002',
          description: 'Development server',
        },
      ],
      tags: [
        {
          name: 'Transactions',
          description: 'Transaction history operations',
        },
        {
          name: 'Health',
          description: 'Health check endpoints',
        },
      ],
    },
    apis: ['./src/routes/*.ts'],
  };

  const swaggerSpec = swaggerJsdoc(swaggerOptions);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Health check endpoint
  /**
   * @swagger
   * /health:
   *   get:
   *     summary: Health check
   *     tags:
   *       - Health
   *     responses:
   *       200:
   *         description: Service is healthy
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                 timestamp:
   *                   type: string
   */
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'ledger-service',
    });
  });

  app.get('/ready', (_req, res) => {
    res.status(200).json({
      status: 'READY',
      timestamp: new Date().toISOString(),
      service: 'ledger-service',
    });
  });

  // Routes
  app.use('/v1', transactionRoutes);

  // Error handling (must be last)
  setupErrorHandling(app);

  return app;
};
