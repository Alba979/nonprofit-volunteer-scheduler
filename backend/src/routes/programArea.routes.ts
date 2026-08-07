import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", async (_req, res) => {
  const areas = await prisma.programArea.findMany({ orderBy: { name: "asc" } });
  res.json(areas);
});

export default router;
