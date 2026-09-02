import pino from 'pino';
import { config } from '../config/env';

const resolvePrettyTransport = (): Record<string, unknown> | undefined => {
  if (config.node.env === 'test') {
    return undefined;
  }

  try {
    require.resolve('pino-pretty');
    return {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      },
    };
  } catch {
    return undefined;
  }
};

export const logger = pino({
  level: config.logging.level,
  ...resolvePrettyTransport(),
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
