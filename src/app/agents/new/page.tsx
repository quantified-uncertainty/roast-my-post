"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";

import { createAgent } from "./actions";
import { type AgentInput, agentSchema } from "./schema";

interface FormFieldConfig {
  name: keyof AgentInput;
  label: string;
  required?: boolean;
  type: "text" | "textarea" | "select";
  placeholder: string;
  options?: { value: string; label: string }[];
}

const formFields: FormFieldConfig[] = [
  {
    name: "name",
    label: "Name",
    required: true,
    type: "text",
    placeholder: "Agent name",
  },
  {
    name: "purpose",
    label: "Purpose",
    required: true,
    type: "select",
    placeholder: "Select agent purpose",
    options: [
      { value: "ASSESSOR", label: "Assessor" },
      { value: "ADVISOR", label: "Advisor" },
      { value: "ENRICHER", label: "Enricher" },
      { value: "EXPLAINER", label: "Explainer" },
    ],
  },
  {
    name: "description",
    label: "Description",
    required: true,
    type: "textarea",
    placeholder: "Describe what this agent does",
  },
  {
    name: "iconName",
    label: "Icon Name",
    required: true,
    type: "text",
    placeholder: "Icon name (e.g., StarIcon)",
  },
  {
    name: "genericInstructions",
    label: "Generic Instructions",
    required: true,
    type: "textarea",
    placeholder: "Instructions for general agent behavior",
  },
  {
    name: "summaryInstructions",
    label: "Summary Instructions",
    required: true,
    type: "textarea",
    placeholder: "Instructions for generating summaries",
  },
  {
    name: "commentInstructions",
    label: "Comment Instructions",
    required: true,
    type: "textarea",
    placeholder: "Instructions for generating comments",
  },
  {
    name: "gradeInstructions",
    label: "Grade Instructions",
    type: "textarea",
    placeholder: "Instructions for grading (optional)",
  },
];

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
      iconName: "",
      genericInstructions: "",
      summaryInstructions: "",
      commentInstructions: "",
      gradeInstructions: "",
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

      if (createResult.data?.success && createResult.data?.agent) {
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
        console.error("Error submitting form:", error);
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
            {formFields.map((field) => (
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
                    className={`form-select ${errors[field.name] ? "border-red-500" : ""}`}
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
                    className={`form-textarea ${errors[field.name] ? "border-red-500" : ""}`}
                    placeholder={field.placeholder}
                  />
                ) : (
                  <input
                    {...register(field.name)}
                    type={field.type}
                    id={field.name}
                    className={`form-input ${errors[field.name] ? "border-red-500" : ""}`}
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
