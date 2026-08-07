import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { ApiError } from "../types";

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { volunteer: true },
  });
  if (!user) throw new ApiError(401, "Invalid email or password");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new ApiError(401, "Invalid email or password");

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role, volunteerId: user.volunteer?.id },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
  );

  return {
    token,
    user: { id: user.id, email: user.email, role: user.role, volunteerId: user.volunteer?.id },
  };
}

export async function registerVolunteerAccount(params: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  programAreaId?: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: params.email } });
  if (existing) throw new ApiError(409, "An account with this email already exists");

  const passwordHash = await bcrypt.hash(params.password, 10);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email: params.email, passwordHash, role: Role.VOLUNTEER },
    });
    const volunteer = await tx.volunteer.create({
      data: {
        userId: user.id,
        firstName: params.firstName,
        lastName: params.lastName,
        email: params.email,
        phone: params.phone,
        programAreaId: params.programAreaId,
      },
    });
    return { user, volunteer };
  });
}
