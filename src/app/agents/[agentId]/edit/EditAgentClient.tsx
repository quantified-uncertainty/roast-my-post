"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";
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

import { updateAgent } from "./actions";

export function EditAgentClient({ agentId }: { agentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError: setFormError,
    reset,
  } = useForm<AgentInput>();

  useEffect(() => {
    // Fetch the agent data from the server
    const fetchAgent = async () => {
      try {
        const response = await fetch(`/api/agents/${agentId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch agent: ${response.statusText}`);
        }

        const data = await response.json();

        // Convert the agent data to form format
        reset({
          name: data.name,
          purpose: data.purpose.toUpperCase(),
          description: data.description,
          genericInstructions: data.genericInstructions || "",
          summaryInstructions: data.summaryInstructions || "",
          analysisInstructions: data.analysisInstructions || "",
          commentInstructions: data.commentInstructions || "",
          gradeInstructions: data.gradeInstructions || "",
          extendedCapabilityId: data.extendedCapabilityId || "",
        });

        setLoading(false);
      } catch (err) {
        console.error("Error fetching agent:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load agent data"
        );
        setLoading(false);
      }
    };

    fetchAgent();
  }, [agentId, reset]);

  const onSubmit = async (data: AgentInput) => {
    try {
      const result = agentSchema.parse(data);
      // Use updateAgent for editing, passing both parsedInput and rawInput
      const updateResult = await updateAgent({
        ...result,
        agentId,
      });

      if (!updateResult?.data) {
        setFormError("root", { message: "Failed to update agent" });
        return;
      }

      if (updateResult.data.success) {
        router.push(`/agents/${agentId}`);
        router.refresh(); // Force a refresh to show the updated data
      } else {
        const errorMessage =
          updateResult.data.error ||
          (typeof updateResult.validationErrors === "string"
            ? updateResult.validationErrors
            : "Failed to update agent");
        setFormError("root", { message: errorMessage });
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        err.errors.forEach((e) => {
          if (e.path[0]) {
            setFormError(e.path[0].toString() as keyof AgentInput, {
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
          <div className="mb-4 text-lg font-semibold">
            Loading agent data...
          </div>
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
                <Link href={`/agents/${agentId}`}>
                  <Button>Back to Agent</Button>
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
            <h1 className="text-2xl font-semibold text-gray-900">Edit Agent</h1>
            <p className="mt-2 text-sm text-gray-600">
              Update your agent (this will create a new version)
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {agentFormFields.map((field) => (
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
              <Link href={`/agents/${agentId}`}>
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
