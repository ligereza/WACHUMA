export type ApiErrorCode =
  | "validation_error"
  | "not_found"
  | "forbidden"
  | "conflict"
  | "provenance_required"
  | "sensitive_record"
  | "license_required"
  | "internal_error";

export class DomainError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("validation_error", message, 400, details);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, publicId: string) {
    super("not_found", `${resource} not found`, 404, { resource, publicId });
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = "Access denied") {
    super("forbidden", message, 403);
    this.name = "ForbiddenError";
  }
}

export interface ApiErrorBody {
  error: ApiErrorCode;
  message: string;
  requestId?: string;
  details?: Record<string, unknown>;
}

export function toApiErrorBody(
  error: unknown,
  requestId?: string,
): { statusCode: number; body: ApiErrorBody } {
  if (error instanceof DomainError) {
    return {
      statusCode: error.statusCode,
      body: {
        error: error.code,
        message: error.message,
        ...(requestId ? { requestId } : {}),
        ...(error.details ? { details: error.details } : {}),
      },
    };
  }

  return {
    statusCode: 500,
    body: {
      error: "internal_error",
      message: "Unexpected internal error",
      ...(requestId ? { requestId } : {}),
    },
  };
}
