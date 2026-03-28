import express from "express";
import { compare, hash } from "bcryptjs";
import prisma from "../../lib/prisma";
import { createSessionJWT, invalidateSession } from "../../lib/session";
import { setSessionCookie, clearSessionCookie } from "../../lib/cookies";

const router = express.Router();

router.post("/login", async (req, res): Promise<any> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    const isPasswordValid = await compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: "Invalid email & password combination",
      });
    }

    const { jwt, expiresAt } = await createSessionJWT(user.id);

    setSessionCookie(res, jwt, expiresAt);

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login failed:", error);
    return res.status(500).json({
      success: false,
      error: "Something went wrong",
    });
  }
});

router.post("/register", async (req, res): Promise<any> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "Name, email, and password are required",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: "User with this email already exists",
      });
    }

    const passwordHash = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
      },
    });

    const { jwt, expiresAt } = await createSessionJWT(user.id);

    setSessionCookie(res, jwt, expiresAt);

    return res.status(201).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Registration failed:", error);
    return res.status(500).json({
      success: false,
      error: "Something went wrong",
    });
  }
});

router.post("/logout", async (req, res): Promise<any> => {
  try {
    if (req.session) {
      await invalidateSession(req.session.id);
    }

    clearSessionCookie(res);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Logout failed:", error);
    return res.status(500).json({
      success: false,
      error: "Something went wrong",
    });
  }
});

/**
 * Get current authenticated user
 */
router.get("/me", (req, res) => {
  if (req.user) {
    // Return user data without sensitive information
    const { passwordHash, ...safeUserData } = req.user;
    res.status(200).json(safeUserData);
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
});

export default router;
