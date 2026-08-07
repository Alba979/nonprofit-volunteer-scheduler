import { Router } from "express";
import { body } from "express-validator";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  listForVolunteer,
  requestCheck,
  resolveCheck,
  clearanceStatus,
  listExpiringSoon,
} from "../controllers/backgroundCheck.controller";

const router = Router();

router.use(requireAuth);

router.get("/expiring-soon", requireRole("ADMIN", "COORDINATOR"), listExpiringSoon);
router.get("/volunteer/:volunteerId", listForVolunteer);
router.get("/volunteer/:volunteerId/clearance", clearanceStatus);

router.post("/request", [body("volunteerId").notEmpty()], validate, requestCheck);

router.patch(
  "/:id",
  requireRole("ADMIN", "COORDINATOR"),
  [body("status").isIn(["PENDING", "CLEARED", "EXPIRED", "REJECTED"])],
  validate,
  resolveCheck
);

export default router;
