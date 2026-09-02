import pino from 'pino';
import { config } from '../config/env';

const shouldUsePrettyTransport =
  config.node.env !== 'test' &&
  (() => {
    try {
      require.resolve('pino-pretty');
      return true;
    } catch {
      return false;
    }
  })();

export const logger = pino({
  level: config.logging.level,
  ...(shouldUsePrettyTransport
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            singleLine: false,
          },
        },
      }
    : {}),
});

export const pinoHttpMiddleware = require('pino-http')({
  logger,
  customSuccessMessage: (req: any, res: any) => {
    return `${req.method} ${req.path} - ${res.statusCode}`;
  },
  customErrorMessage: (req: any, res: any, err: any) => {
    return `${req.method} ${req.path} - ${res.statusCode} - ${err.message}`;
  },
});
