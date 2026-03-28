import prisma from "./prisma";
import type { Session, User } from "@prisma/client";
import jwt from "jsonwebtoken";

export const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-key";

if (
  SESSION_SECRET === "dev-secret-key" &&
  process.env.NODE_ENV === "production"
) {
  console.warn(
    "WARNING: Using default session secret in production. Set SESSION_SECRET env variable!"
  );
}

const SESSION_REFRESH_INTERVAL_MS = 1000 * 60 * 60 * 24 * 15; // 15 days
const SESSION_MAX_DURATION_MS = SESSION_REFRESH_INTERVAL_MS * 2; // 30 days

export async function createSessionJWT(
  userId: string
): Promise<{ jwt: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + SESSION_MAX_DURATION_MS);

  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt,
    },
  });

  const token = jwt.sign({ sessionId: session.id }, SESSION_SECRET, {
    algorithm: "HS256",
    expiresIn: Math.floor(SESSION_MAX_DURATION_MS / 1000), // seconds
  });

  return { jwt: token, expiresAt };
}

export async function validateSessionJWT(
  token: string
): Promise<SessionValidationResult> {
  try {
    const payload = jwt.verify(token, SESSION_SECRET) as any;
    const sessionId = payload.sessionId as string;

    if (!sessionId) {
      return { session: null, user: null };
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session || new Date() > session.expiresAt) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } });
      }
      return { session: null, user: null };
    }

    if (
      Date.now() >=
      session.expiresAt.getTime() - SESSION_REFRESH_INTERVAL_MS
    ) {
      const newExpiry = new Date(Date.now() + SESSION_MAX_DURATION_MS);
      await prisma.session.update({
        where: { id: session.id },
        data: { expiresAt: newExpiry },
      });
    }

    const { user, ...sessionData } = session;
    return { session: sessionData, user };
  } catch (err) {
    console.error("Session validation error:", err);
    return { session: null, user: null };
  }
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await prisma.session.delete({ where: { id: sessionId } });
}

export async function invalidateUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

export type SessionValidationResult =
  | { session: Session; user: User }
  | { session: null; user: null };

export const SESSION_COOKIE_CONFIG = {
  MAX_AGE: SESSION_MAX_DURATION_MS,
  MAX_AGE_SECONDS: SESSION_MAX_DURATION_MS / 1000,
};
