import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { pinoHttpMiddleware } from './middleware/logger';
import { setupErrorHandling } from './middleware/errorHandler';
import paymentRoutes from './routes/payments';

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
    const requestId = (req.headers['x-request-id'] as string) || `gw-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
        title: 'SwiftPay Transaction Gateway API',
        version: '0.1.0',
        description:
          'Real-time payment processing gateway with idempotency and Kafka integration',
        contact: {
          name: 'SwiftPay',
        },
      },
      servers: [
        {
          url: 'http://localhost:3001',
          description: 'Development server',
        },
      ],
      tags: [
        {
          name: 'Payments',
          description: 'Payment operations',
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
      service: 'transaction-gateway',
    });
  });

  app.get('/ready', (_req, res) => {
    res.status(200).json({
      status: 'READY',
      timestamp: new Date().toISOString(),
      service: 'transaction-gateway',
    });
  });

  // Routes
  app.use('/v1', paymentRoutes);

  // Error handling (must be last)
  setupErrorHandling(app);

  return app;
};
