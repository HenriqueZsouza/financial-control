import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Schema for profile update (excluding email)
const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  phone: z.string().min(1, 'Phone is required').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters').optional(),
}).refine(
  (data) => {
    // If password is provided, confirmPassword must be provided and match
    if (data.password || data.confirmPassword) {
      return data.password === data.confirmPassword;
    }
    return true; // skip if neither is provided
  },
  {
    message: "Passwords don't match",
    path: ["confirmPassword"], // path of error
  }
);

export const updateProfileHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    const validated = updateProfileSchema.parse(req.body);

    // Fetch current user to ensure exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prepare update data
    const updateData: any = {};
    if (validated.firstName !== undefined) updateData.firstName = validated.firstName;
    if (validated.lastName !== undefined) updateData.lastName = validated.lastName;
    if (validated.phone !== undefined) updateData.phone = validated.phone;

    // Handle password update if provided
    if (validated.password && validated.confirmPassword) {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(validated.password, salt);
    }

    // If no update data, return early (though validation should have at least one field)
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true, // email is included in the response but is read-only
        phone: true,
        createdAt: true,
      },
    });

    res.json({ user: updatedUser });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    next(error);
  }
};