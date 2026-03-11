// ---------------------------------------------------------------------------
// AppError — typed HTTP errors thrown throughout the app
// ---------------------------------------------------------------------------

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
    // Maintains proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }

  static notFound(resource = 'Resource'): AppError {
    return new AppError(404, `${resource} not found`)
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(400, message, details)
  }

  static internal(message = 'Internal server error'): AppError {
    return new AppError(500, message)
  }
}
