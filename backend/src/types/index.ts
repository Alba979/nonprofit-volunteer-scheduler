import { Role } from "@prisma/client";

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: Role;
  volunteerId?: string;
}

// Augment Express's Request with the authenticated user, set by requireAuth.
declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export class ApiError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}
