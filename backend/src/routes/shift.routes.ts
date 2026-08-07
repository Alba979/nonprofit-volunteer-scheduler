import { Router } from "express";
import { body } from "express-validator";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  listShifts,
  getShift,
  createShift,
  bookShiftHandler,
  cancelBookingHandler,
  logAttendanceHandler,
  requestReplacementsHandler,
} from "../controllers/shift.controller";

const router = Router();

router.use(requireAuth);

router.get("/", listShifts);
router.get("/:id", getShift);

router.post(
  "/",
  requireRole("ADMIN", "COORDINATOR"),
  [
    body("title").notEmpty(),
    body("programAreaId").notEmpty(),
    body("location").notEmpty(),
    body("startTime").isISO8601(),
    body("endTime").isISO8601(),
    body("capacity").isInt({ min: 1 }),
  ],
  validate,
  createShift
);

router.post("/:id/book", [body("volunteerId").notEmpty()], validate, bookShiftHandler);
router.post("/:id/request-replacements", requireRole("ADMIN", "COORDINATOR"), requestReplacementsHandler);
router.post("/bookings/:bookingId/cancel", cancelBookingHandler);
router.post(
  "/bookings/:bookingId/attendance",
  requireRole("ADMIN", "COORDINATOR"),
  [body("status").isIn(["ATTENDED", "NO_SHOW", "EXCUSED", "PENDING"])],
  validate,
  logAttendanceHandler
);

export default router;
