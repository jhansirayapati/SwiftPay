declare module 'swagger-ui-express' {
  import { RequestHandler } from 'express';

  export const serve: RequestHandler[];

  export function setup(
    swaggerDoc?: object,
    opts?: object,
    options?: object,
    customCss?: string
  ): RequestHandler;
}