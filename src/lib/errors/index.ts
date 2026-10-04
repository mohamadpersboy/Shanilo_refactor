/** Base class for expected, typed application errors. */
export class AppError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 500, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
  }
}

/** A required configuration group is missing or invalid. Message lists variable NAMES only. */
export class ConfigError extends AppError {
  readonly group: string;
  readonly variables: readonly string[];

  constructor(group: string, variables: readonly string[]) {
    super(
      "CONFIG_INVALID",
      `Invalid or missing environment configuration for "${group}": ${variables.join(", ")}`,
      500,
    );
    this.group = group;
    this.variables = variables;
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed") {
    super("VALIDATION_FAILED", message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super("NOT_FOUND", message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super("UNAUTHORIZED", message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super("FORBIDDEN", message, 403);
  }
}

/** Safe JSON shape for API responses. Never leaks internals of unexpected errors. */
export function toErrorResponse(error: unknown): { status: number; body: { error: { code: string; message: string } } } {
  if (error instanceof AppError && error.status < 500) {
    return { status: error.status, body: { error: { code: error.code, message: error.message } } };
  }
  return { status: 500, body: { error: { code: "INTERNAL_ERROR", message: "Internal server error" } } };
}
