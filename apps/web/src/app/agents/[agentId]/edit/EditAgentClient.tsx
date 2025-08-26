"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useForm, type FieldError } from "react-hook-form";
import { z } from "zod";

import { agentFormFields } from "@/components/agent/agentFormFields";
import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import {
  type AgentInput,
  AgentInputSchema,
} from "@roast/ai";

import { updateAgent } from "./actions";

export function EditAgentClient({ agentId }: { agentId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [isDeprecated, setIsDeprecated] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError: setFormError,
    reset,
  } = useForm<AgentInput>({
    defaultValues: {
      name: "",
      description: "",
      primaryInstructions: "",
      selfCritiqueInstructions: "",
      providesGrades: false,
      pluginIds: [],
      extendedCapabilityId: "",
      readme: "",
    }
  });

  useEffect(() => {
    // Check if this is an import flow
    const isImport = searchParams.get("import") === "true";

    const fetchAgent = async () => {
      try {
        // Check for imported data first
        let importedData = null;
        if (isImport) {
          const storedData = sessionStorage.getItem(
            `importedAgentData_${agentId}`
          );
          if (storedData) {
            importedData = JSON.parse(storedData);
            setImportNotice(
              "Form pre-filled with imported data. Review and save to apply changes."
            );
          }
        }

        // Fetch the current agent data from the server
        const response = await fetch(`/api/agents/${agentId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch agent: ${response.statusText}`);
        }

        const data = await response.json();

        // Validate that we got data back
        if (!data) {
          throw new Error("No data returned from API");
        }

        // Set the deprecation status
        setIsDeprecated(data.isDeprecated || false);

        // Convert the agent data to form format
        // When importing, use imported data preferentially for all fields
        const resetData = {
          name: importedData ? importedData.name : data.name,
          description: importedData
            ? importedData.description
            : data.description,
          primaryInstructions: importedData
            ? (importedData.primaryInstructions ?? "")
            : data.primaryInstructions || "",
          selfCritiqueInstructions: importedData
            ? (importedData.selfCritiqueInstructions ?? "")
            : data.selfCritiqueInstructions || "",
          providesGrades: importedData
            ? (importedData.providesGrades ?? false)
            : data.providesGrades ?? false,
          pluginIds: importedData
            ? (importedData.pluginIds ?? [])
            : data.pluginIds || [],
          extendedCapabilityId: importedData
            ? (importedData.extendedCapabilityId ?? "")
            : data.extendedCapabilityId || "",
          readme: importedData
            ? (importedData.readme ?? "")
            : data.readme || "",
        };

        reset(resetData);

        // Clear the stored data after successful form reset
        if (importedData) {
          sessionStorage.removeItem(`importedAgentData_${agentId}`);
        }

        setLoading(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load agent data"
        );
        setLoading(false);
      }
    };

    fetchAgent();
  }, [agentId, reset, searchParams]);

  const onSubmit = async (data: AgentInput) => {
    try {
      const dataWithDeprecation = {
        ...data,
        isDeprecated,
      };
      const result = AgentInputSchema.parse(dataWithDeprecation);

      // Use updateAgent for editing
      const dataToSend = {
        ...result,
        agentId,
      };

      const updateResult = await updateAgent(dataToSend);

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

            {importNotice && (
              <div className="mt-4 rounded-md bg-blue-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Import Successful
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      {importNotice}
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                error={errors[field.name] as FieldError | undefined}
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
                ) : field.type === "multiselect" ? (
                  <div className="space-y-2">
                    {field.options?.map((option) => (
                      <div key={option.value} className="flex items-start">
                        <div className="flex items-center h-5">
                          <input
                            {...register(field.name)}
                            type="checkbox"
                            value={option.value}
                            id={`${field.name}-${option.value}`}
                            className="form-checkbox h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor={`${field.name}-${option.value}`} className="font-medium text-gray-700">
                            {option.label}
                          </label>
                        </div>
                      </div>
                    ))}
                    {field.description && (
                      <p className="text-sm text-gray-500">{field.description}</p>
                    )}
                  </div>
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

            {/* Deprecation checkbox */}
            <div className="flex items-start border-t pt-6">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  id="isDeprecated"
                  checked={isDeprecated}
                  onChange={(e) => setIsDeprecated(e.target.checked)}
                  className="form-checkbox h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="isDeprecated" className="font-medium text-gray-700">
                  Mark as Deprecated
                </label>
                <p className="text-gray-500">
                  This will mark your agent as deprecated. Users will see a warning that this agent is no longer recommended for use.
                </p>
              </div>
            </div>

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
