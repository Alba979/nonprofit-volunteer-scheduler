import { Router } from "express";
import { body } from "express-validator";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  listVolunteers,
  getVolunteer,
  createVolunteer,
  updateVolunteer,
} from "../controllers/volunteer.controller";

const router = Router();

router.use(requireAuth);

router.get("/", listVolunteers);
router.get("/:id", getVolunteer);

router.post(
  "/",
  requireRole("ADMIN", "COORDINATOR"),
  [body("firstName").notEmpty(), body("lastName").notEmpty(), body("email").isEmail(), body("phone").notEmpty()],
  validate,
  createVolunteer
);

router.patch("/:id", requireRole("ADMIN", "COORDINATOR"), updateVolunteer);

export default router;
