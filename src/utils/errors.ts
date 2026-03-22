export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string) {
    super(401, message, true);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string) {
    super(403, message, true);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message, true);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message, true);
  }
}
