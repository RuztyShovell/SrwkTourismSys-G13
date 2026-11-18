import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errors.js';

// Verify JWT and attach { accountId, role } to the request.
// Role decides what each function may do (ODD security attribute).
export const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401));
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    req.user = { accountId: payload.accountId, role: payload.role };
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401));
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError('You are not allowed to perform this action', 403));
  }
  next();
};
