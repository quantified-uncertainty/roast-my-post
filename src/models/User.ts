import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getUserSelectFields, getPublicUserFields } from "@/lib/user-permissions";

// Define schema for User object
export const UserSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  isCurrentUser: z.boolean().optional(),
});

// Input validation schema for updating a user
export const UserUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

export type User = z.infer<typeof UserSchema>;
export type UserUpdate = z.infer<typeof UserUpdateSchema>;

export class UserModel {
  static async getAllUsers(): Promise<User[]> {
    try {
      const users = await prisma.user.findMany({
        select: getPublicUserFields(),
      });

      return users.map((user) => UserSchema.parse(user));
    } finally {
      await prisma.$disconnect();
    }
  }

  static async getUser(
    userId: string,
    currentUserId?: string
  ): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: getUserSelectFields(currentUserId, userId),
      });

      if (!user) return null;

      const isCurrentUser = currentUserId === user.id;

      return UserSchema.parse({
        ...user,
        isCurrentUser,
      });
    } finally {
      await prisma.$disconnect();
    }
  }

  static async updateUser(
    userId: string,
    data: UserUpdate,
    currentUserId: string
  ): Promise<User> {
    try {
      // Check if the current user is the owner
      if (userId !== currentUserId) {
        throw new Error("You don't have permission to update this user");
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          name: data.name,
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      });

      return UserSchema.parse({
        ...updatedUser,
        isCurrentUser: true,
      });
    } finally {
      await prisma.$disconnect();
    }
  }

  static async getUserDocumentsCount(userId: string): Promise<number> {
    try {
      return await prisma.document.count({
        where: { submittedById: userId },
      });
    } finally {
      await prisma.$disconnect();
    }
  }

  static async getUserAgentsCount(userId: string): Promise<number> {
    try {
      return await prisma.agent.count({
        where: { submittedById: userId },
      });
    } finally {
      await prisma.$disconnect();
    }
  }
}
