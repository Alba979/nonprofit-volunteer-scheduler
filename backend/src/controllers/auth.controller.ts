import { Request, Response } from "express";
import * as authService from "../services/auth.service";

export async function loginHandler(req: Request, res: Response) {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.json(result);
}

export async function registerHandler(req: Request, res: Response) {
  const { email, password, firstName, lastName, phone, programAreaId } = req.body;
  const result = await authService.registerVolunteerAccount({
    email,
    password,
    firstName,
    lastName,
    phone,
    programAreaId,
  });
  res.status(201).json({
    volunteer: result.volunteer,
    user: { id: result.user.id, email: result.user.email, role: result.user.role },
  });
}
