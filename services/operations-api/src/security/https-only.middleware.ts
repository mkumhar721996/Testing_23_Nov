import type { RequestHandler } from 'express';

const HSTS = 'max-age=31536000; includeSubDomains';

/**
 * Refuses plain HTTP before auth or any controller runs. TLS ends at the load
 * balancer, so `req.secure` comes from X-Forwarded-Proto (trust proxy).
 */
export function httpsOnly(opts: { required: boolean }): RequestHandler {
  return (req, res, next) => {
    if (req.secure) res.setHeader('Strict-Transport-Security', HSTS);
    if (!opts.required || req.secure || req.path === '/health') return next();
    res.status(426).json({ message: 'HTTPS is required' });
  };
}
