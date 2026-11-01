import { Request, Response, NextFunction } from 'express';

export function roleGuard(allowedRoles: Array<'DELIVERY' | 'RECIPIENT' | 'GUARD' | 'ADMIN'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized: User not authenticated' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: Access restricted to roles [${allowedRoles.join(', ')}]. Your role: ${req.user.role}`,
      });
      return;
    }

    next();
  };
}
