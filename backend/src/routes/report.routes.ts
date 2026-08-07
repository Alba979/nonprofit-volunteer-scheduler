import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  retentionReport,
  noShowReport,
  complianceExport,
  dashboardSummary,
} from "../controllers/report.controller";

const router = Router();

router.use(requireAuth);

router.get("/dashboard", dashboardSummary);
router.get("/retention", retentionReport);
router.get("/no-show-rate", noShowReport);
router.get("/compliance-export", requireRole("ADMIN", "COORDINATOR"), complianceExport);

export default router;
