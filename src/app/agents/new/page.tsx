"use client";

import Link from "next/link";
import { logger } from "@/lib/logger";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { agentFormFields } from "@/components/agent/agentFormFields";
import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import {
  type AgentInput,
  agentSchema,
} from "@/models/Agent";

import { createAgent } from "./actions";

export default function NewAgentPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<AgentInput>({
    defaultValues: {
      name: "",
      purpose: "ASSESSOR",
      description: "",
      primaryInstructions: "",
      providesGrades: false,
      extendedCapabilityId: "",
    },
  });

  const onSubmit = async (data: AgentInput) => {
    try {
      const result = agentSchema.parse(data);
      const createResult = await createAgent(result);

      if (!createResult) {
        setError("root", { message: "Failed to create agent" });
        return;
      }

      if (createResult.data?.success && createResult.data?.id) {
        router.push(`/agents/${createResult.data.id}`);
      } else {
        const errorMessage =
          createResult.data?.error ||
          (typeof createResult.validationErrors === "string"
            ? createResult.validationErrors
            : "Failed to create agent");
        setError("root", { message: errorMessage });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          if (err.path[0]) {
            setError(err.path[0].toString() as keyof AgentInput, {
              message: err.message,
            });
          }
        });
      } else {
        logger.error('Error submitting form:', error);
        setError("root", { message: "An unexpected error occurred" });
      }
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">
              Add New Agent
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Create a new evaluation agent
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {agentFormFields.map((field) => (
              field.type === "checkbox" ? (
                <div key={field.name} className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      {...register(field.name)}
                      type="checkbox"
                      id={field.name}
                      className={`form-checkbox h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${errors[field.name] ? "border-red-500" : ""}`}
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor={field.name} className="font-medium text-gray-700">
                      {field.label}
                    </label>
                    {field.description && (
                      <p className="text-gray-500">{field.description}</p>
                    )}
                    {errors[field.name] && (
                      <p className="mt-1 text-sm text-red-600">{errors[field.name]?.message}</p>
                    )}
                  </div>
                </div>
              ) : (
              <FormField
                key={field.name}
                name={field.name}
                label={field.label}
                required={field.required}
                error={errors[field.name]}
              >
                {field.type === "select" ? (
                  <select
                    {...register(field.name)}
                    id={field.name}
                    className={`form-select w-full ${errors[field.name] ? "border-red-500" : ""}`}
                  >
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea
                    {...register(field.name)}
                    id={field.name}
                    rows={4}
                    className={`form-textarea w-full ${errors[field.name] ? "border-red-500" : ""}`}
                    placeholder={field.placeholder}
                  />
                ) : (
                  <input
                    {...register(field.name)}
                    type={field.type}
                    id={field.name}
                    className={`form-input w-full ${errors[field.name] ? "border-red-500" : ""}`}
                    placeholder={field.placeholder}
                  />
                )}
              </FormField>
              )
            ))}

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
              <Link href="/agents">
                <Button variant="secondary">Cancel</Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Agent"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
