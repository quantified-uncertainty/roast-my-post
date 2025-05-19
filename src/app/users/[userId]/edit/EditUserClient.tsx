"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { UserUpdateSchema } from "@/models/User";

import { updateUser } from "./actions";

type UserInput = z.infer<typeof UserUpdateSchema>;

export function EditUserClient({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError: setFormError,
    reset,
  } = useForm<UserInput>();

  useEffect(() => {
    // Fetch the user data from the server
    const fetchUser = async () => {
      try {
        const response = await fetch(`/api/users/${userId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch user: ${response.statusText}`);
        }

        const data = await response.json();

        // Set form data from user data
        reset({
          name: data.name || "",
        });

        setLoading(false);
      } catch (err) {
        console.error("Error fetching user:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load user data"
        );
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId, reset]);

  const onSubmit = async (data: UserInput) => {
    try {
      // Call the server action
      const updateResult = await updateUser({
        userId,
        ...data,
      });

      if (!updateResult || !updateResult.data) {
        setFormError("root", { message: "Failed to update profile" });
        return;
      }

      if (updateResult.data.success) {
        router.push(`/users/${userId}`);
        router.refresh(); // Force a refresh to show the updated data
      } else {
        const errorMessage =
          updateResult.data.error || "Failed to update profile";
        setFormError("root", { message: errorMessage });
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        err.errors.forEach((e) => {
          if (e.path[0]) {
            setFormError(e.path[0].toString() as keyof UserInput, {
              message: e.message,
            });
          }
        });
      } else {
        console.error("Error submitting form:", err);
        setFormError("root", { message: "An unexpected error occurred" });
      }
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-lg font-semibold">Loading user data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
              <div className="mt-4">
                <Link href={`/users/${userId}`}>
                  <Button>Back to Profile</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">
              Edit Profile
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Update your profile information
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              name="name"
              label="Name"
              required={true}
              error={errors.name}
            >
              <input
                {...register("name")}
                type="text"
                id="name"
                className={`form-input ${errors.name ? "border-red-500" : ""}`}
                placeholder="Your name"
              />
            </FormField>

            {errors.root && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      {errors.root.message}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Link href={`/users/${userId}`}>
                <Button variant="secondary">Cancel</Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
