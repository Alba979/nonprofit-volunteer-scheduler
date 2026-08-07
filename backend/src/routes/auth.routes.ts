import { Router } from "express";
import { body } from "express-validator";
import { validate } from "../middleware/validate";
import { loginHandler, registerHandler } from "../controllers/auth.controller";

const router = Router();

router.post(
  "/login",
  [body("email").isEmail(), body("password").isString().notEmpty()],
  validate,
  loginHandler
);

router.post(
  "/register",
  [
    body("email").isEmail(),
    body("password").isLength({ min: 8 }),
    body("firstName").isString().notEmpty(),
    body("lastName").isString().notEmpty(),
    body("phone").isString().notEmpty(),
  ],
  validate,
  registerHandler
);

export default router;
