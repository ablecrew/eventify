import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import cors from "cors";

import { authMiddleware } from "../lib/auth-middleware";
import authRouter from "./routes/auth";
import eventsRouter from "./routes/events";
import ticketsRouter from "./routes/tickets";
import wishlistRouter from "./routes/wishlist";
import discountCodeRouter from "./routes/discount-codes";
import purchaseRouter from "./routes/purchase";
import dashboardRouter from "./routes/dashboard";

const app = express();

// -- Static assets --------------------------------------------------
app.use(express.static(path.join(__dirname, "../public")));
app.get("/", (_, res) => res.redirect("/pages/index.html"));

// -- Body parsing middleware (IN CORRECT ORDER) --------------------
// Handle different body types for serverless environment
app.use(express.raw({ type: "application/json", limit: "10mb" }));

// Parse raw buffer bodies from serverless functions
app.use((req, res, next) => {
  if (req.body && Buffer.isBuffer(req.body) && req.body.length > 0) {
    try {
      req.body = JSON.parse(req.body.toString());
    } catch (e) {
      console.error("Failed to parse buffer body:", e);
    }
  }
  next();
});

// Fallback JSON parser
app.use(express.json({ limit: "10mb" }));

// -- Other middleware -----------------------------------------------
app.use(cookieParser());
app.use(
  cors({
    origin: true, // Allow same-origin requests
    credentials: true,
  })
);

app.use(authMiddleware);

// -- Health check --------------------------------------------------
app.get("/api/health", async (req, res) => {
  try {
    console.log("Health check called");
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error("Health check failed:", error);
    res.status(500).json({
      status: "error",
      error: error.message,
    });
  }
});

// -- Routes ---------------------------------------------------------
app.use("/api/auth", authRouter);
app.use("/api/events", eventsRouter);
app.use("/api/purchases", purchaseRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/wishlist", wishlistRouter);
app.use("/api/discount-codes", discountCodeRouter);
app.use("/api/dashboard", dashboardRouter);

// -- Error handler --------------------------------------------------
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Express error:", err);
    console.error("Stack:", err.stack);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
);

export default app;
