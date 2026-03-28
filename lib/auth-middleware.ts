import { Request, Response, NextFunction } from "express";
import { SESSION_COOKIE_NAME } from "./cookies";
import { validateSessionJWT } from "./session";
import type { Session, User } from "@prisma/client";

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.cookies[SESSION_COOKIE_NAME];

  if (!token) {
    req.user = null;
    req.session = null;
    return next();
  }

  const { user, session } = await validateSessionJWT(token);

  req.user = user;
  req.session = session;

  next();
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: "Authentication required",
    });
    return;
  }

  next();
}

// Type declarations for Express request
declare global {
  namespace Express {
    interface Request {
      user?: User | null;
      session?: Session | null;
    }
  }
}
