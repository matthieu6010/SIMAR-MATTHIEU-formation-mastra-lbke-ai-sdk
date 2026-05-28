import type { MiddlewareHandler } from 'hono';

export const paidUserMiddleware: MiddlewareHandler = async (context, next) => {
  const requestContext = context.get('requestContext');
  const cookies = context.req.header('Cookie');
  // Improve by adding a real cookie parser here + payment check
  if (cookies?.match('paid-user')) {
    requestContext.set('paid-user', true);
  } else {
    requestContext.set('paid-user', false);
  }
  await next();
};
