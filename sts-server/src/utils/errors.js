// User-centric exceptions per ODD section 1.2
export class AppError extends Error {
  constructor(message, statusCode = 400, field = null) {
    super(message);
    this.statusCode = statusCode;
    this.field = field;
  }
}

// Invalid Data Exception (ODD 1.2.4) - names the field that needs correction
export class InvalidDataError extends AppError {
  constructor(field, message) {
    super(message || `${field} is invalid`, 400, field);
  }
}

// Invalid Email or Password Exception (ODD 1.2.3) - never reveals which credential was wrong
export class InvalidCredentialsError extends AppError {
  constructor() {
    super('Invalid email or password. Please try again or reset your password.', 401);
  }
}

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const notFound = (req, res, next) =>
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
    field: err.field || undefined,
  });
};
