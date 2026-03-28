import express from "express";
import crypto from "crypto";
import prisma from "../../lib/prisma";

const router = express.Router();

router.post("/validate", async (req, res): Promise<any> => {
  const { eventId, code } = req.body;

  if (!eventId || !code) {
    return res.status(400).json({ error: "Missing eventId or code" });
  }

  const codeHash = crypto.createHash("sha256").update(code).digest("hex");

  const discount = await prisma.discountCode.findFirst({
    where: {
      eventId,
      codeHash,
      validTill: { gte: new Date() },
    },
  });

  if (!discount) {
    return res.status(404).json({ error: "Invalid or expired discount code" });
  }

  return res.json({
    discountId: discount.id,
    discountPercent: discount.discountPercent,
    validTill: discount.validTill,
  });
});

export default router;

