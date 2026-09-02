import pino from 'pino';
import { config } from '../config/env';

export const logger = pino({
  level: config.logging.level,
  transport:
    config.node.env !== 'test'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            singleLine: false,
          },
        }
      : undefined,
});

export const pinoHttpMiddleware = require('pino-http')({
  logger,
  customSuccessMessage: (req: any, res: any) => `${req.method} ${req.path} - ${res.statusCode}`,
  customErrorMessage: (req: any, res: any, err: any) => `${req.method} ${req.path} - ${res.statusCode} - ${err.message}`,
});
