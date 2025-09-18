export class AppError extends Error {
  constructor(public code: string, message: string, public status = 400, public meta?: Record<string, unknown>) {
    super(message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, meta?: Record<string, unknown>) {
    super('NOT_FOUND', `${resource} not found`, 404, meta);
  }
}

export class AuthError extends AppError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super('RATE_LIMIT', message, 429);
  }
}
