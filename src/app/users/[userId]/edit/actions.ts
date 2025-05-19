"use server";

import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { UserModel, UserUpdateSchema } from "@/models/User";

// Setup next-safe-action
const actionClient = createSafeActionClient();

// Define response type
interface UserResponse {
  success: boolean;
  error?: string;
  user?: {
    id: string;
    name: string | null;
  };
}

// Server action for updating a user
export const updateUser = actionClient
  .schema(
    z.object({
      userId: z.string(),
      name: z.string().min(1, "Name is required").max(100),
    })
  )
  .action(async (data): Promise<UserResponse> => {
    try {
      const userId = data.parsedInput.userId;

      if (!userId) {
        throw new Error("User ID is required");
      }

      const session = await auth();

      if (!session?.user?.id) {
        throw new Error("You must be logged in to update your profile");
      }

      if (session.user.id !== userId) {
        throw new Error("You can only update your own profile");
      }

      const updatedUser = await UserModel.updateUser(
        userId,
        { name: data.parsedInput.name },
        session.user.id
      );

      return {
        success: true,
        user: {
          id: updatedUser.id,
          name: updatedUser.name || null,
        },
      };
    } catch (error) {
      console.error("Error updating user:", error);
      if (error instanceof Error) {
        console.error("Error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update user",
      };
    }
  });
