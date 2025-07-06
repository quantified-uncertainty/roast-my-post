"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { logger } from "@/lib/logger";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import * as yaml from "js-yaml";

import { agentFormFields } from "@/components/agent/agentFormFields";
import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import {
  type AgentInput,
  agentSchema,
} from "@/models/Agent";
import {
  DocumentTextIcon,
  CodeBracketIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  BookOpenIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";

import { createAgent } from "./actions";

interface ValidationResult {
  isValidYaml: boolean;
  yamlError?: string;
  hasRequiredFields: boolean;
  missingFields: string[];
  extraFields: string[];
  parsedData?: any;
  warnings: string[];
}

const REQUIRED_FIELDS = ["name", "description"];
const OPTIONAL_FIELDS = [
  "primaryInstructions",
  "selfCritiqueInstructions",
  "providesGrades",
  "extendedCapabilityId",
  "readme",
];
const ALL_SUPPORTED_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

export default function NewAgentPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"form" | "yaml" | "github">("form");
  const [yamlText, setYamlText] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isCreatingFromYaml, setIsCreatingFromYaml] = useState(false);
  const [isImportingFromGithub, setIsImportingFromGithub] = useState(false);
  const [githubImportError, setGithubImportError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<AgentInput>({
    defaultValues: {
      name: "",
      description: "",
      primaryInstructions: "",
      providesGrades: false,
      extendedCapabilityId: "",
    },
  });

  // Validate YAML in real-time
  useEffect(() => {
    if (mode !== "yaml" || !yamlText.trim()) {
      setValidation(null);
      return;
    }

    try {
      const parsed = yaml.load(yamlText);

      if (!parsed || typeof parsed !== "object") {
        setValidation({
          isValidYaml: false,
          yamlError: "YAML must contain an object",
          hasRequiredFields: false,
          missingFields: REQUIRED_FIELDS,
          extraFields: [],
          warnings: [],
        });
        return;
      }

      const parsedObj = parsed as Record<string, any>;
      const missingFields = REQUIRED_FIELDS.filter(
        (field) => !parsedObj[field]
      );
      const extraFields = Object.keys(parsedObj).filter(
        (field) => !ALL_SUPPORTED_FIELDS.includes(field)
      );

      const warnings: string[] = [];

      // Check for overly long fields that might be truncated
      Object.entries(parsedObj).forEach(([key, value]) => {
        if (typeof value === "string" && value.length > 10000) {
          warnings.push(
            `Field "${key}" is very long (${value.length} characters) - may affect performance`
          );
        }
      });

      // Check description length
      if (parsedObj.description && parsedObj.description.length < 30) {
        warnings.push("Description should be at least 30 characters");
      }


      // Warn about extra fields that won't be saved
      if (extraFields.length > 0) {
        warnings.push(`These fields won't be saved: ${extraFields.join(", ")}`);
      }

      setValidation({
        isValidYaml: true,
        hasRequiredFields: missingFields.length === 0,
        missingFields,
        extraFields,
        parsedData: parsedObj,
        warnings,
      });
    } catch (error) {
      setValidation({
        isValidYaml: false,
        yamlError:
          error instanceof Error ? error.message : "Invalid YAML syntax",
        hasRequiredFields: false,
        missingFields: REQUIRED_FIELDS,
        extraFields: [],
        warnings: [],
      });
    }
  }, [yamlText, mode]);

  const handleCreateFromYaml = async () => {
    if (!validation?.isValidYaml || !validation.hasRequiredFields) return;

    setIsCreatingFromYaml(true);
    try {
      // Extract only the supported fields
      const agentData: AgentInput = {
        name: validation.parsedData.name,
        description: validation.parsedData.description,
        providesGrades: validation.parsedData.providesGrades || false,
      };

      // Add optional fields if they exist
      OPTIONAL_FIELDS.forEach((field) => {
        if (validation.parsedData[field] !== undefined) {
          (agentData as any)[field] = validation.parsedData[field];
        }
      });

      const result = agentSchema.parse(agentData);
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
        alert(errorMessage);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('\n');
        alert(`Validation errors:\n${errorMessages}`);
      } else {
        logger.error('Error creating agent from YAML:', error);
        alert("An unexpected error occurred");
      }
    } finally {
      setIsCreatingFromYaml(false);
    }
  };

  const handleImportFromGithub = async () => {
    if (!githubUrl) return;

    setIsImportingFromGithub(true);
    setGithubImportError(null);

    try {
      // Call the API to import from GitHub
      const response = await fetch('/api/agents/import-github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ githubUrl }),
      });

      const result = await response.json();

      if (!response.ok) {
        setGithubImportError(result.error || 'Failed to import from GitHub');
        return;
      }

      if (result.agentId) {
        router.push(`/agents/${result.agentId}`);
      } else {
        setGithubImportError('Import succeeded but no agent ID returned');
      }
    } catch (error) {
      logger.error('Error importing from GitHub:', error);
      setGithubImportError('Failed to connect to the server');
    } finally {
      setIsImportingFromGithub(false);
    }
  };

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

  const getValidationIcon = () => {
    if (!validation) return null;

    if (!validation.isValidYaml) {
      return <XCircleIcon className="h-5 w-5 text-red-500" />;
    } else if (!validation.hasRequiredFields) {
      return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
    } else {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    }
  };

  const getValidationStatus = () => {
    if (!validation) return "No YAML content";

    if (!validation.isValidYaml) {
      return "Invalid YAML";
    } else if (!validation.hasRequiredFields) {
      return "Missing required fields";
    } else {
      return "Valid YAML configuration";
    }
  };

  const canCreateFromYaml = validation?.isValidYaml && validation.hasRequiredFields;

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  Add New Agent
                </h1>
                <p className="mt-2 text-sm text-gray-600">
                  Create a new evaluation agent
                </p>
              </div>
              <Link
                href="/agents/readme"
                className="inline-flex items-center gap-2 rounded-md bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <BookOpenIcon className="h-4 w-4" />
                Agent Documentation
              </Link>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="mb-8">
            <div className="flex rounded-lg bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setMode("form")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  mode === "form"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <DocumentTextIcon className="h-4 w-4" />
                Form
              </button>
              <button
                type="button"
                onClick={() => setMode("yaml")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  mode === "yaml"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <CodeBracketIcon className="h-4 w-4" />
                YAML
              </button>
              <button
                type="button"
                onClick={() => setMode("github")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  mode === "github"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                GitHub
              </button>
            </div>
          </div>

          {mode === "form" ? (
            // Form Mode
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
          ) : mode === "yaml" ? (
            // YAML Mode
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* Input Section */}
              <div className="space-y-6">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="yaml-text"
                      className="block text-sm font-medium text-gray-700"
                    >
                      YAML Configuration
                    </label>
                    <div className="flex items-center gap-2 text-sm">
                      {getValidationIcon()}
                      <span
                        className={`${
                          !validation
                            ? "text-gray-500"
                            : !validation.isValidYaml
                              ? "text-red-600"
                              : !validation.hasRequiredFields
                                ? "text-yellow-600"
                                : "text-green-600"
                        }`}
                      >
                        {getValidationStatus()}
                      </span>
                    </div>
                  </div>
                  <textarea
                    id="yaml-text"
                    value={yamlText}
                    onChange={(e) => setYamlText(e.target.value)}
                    placeholder="name: My Agent
description: A helpful agent that does amazing things
primaryInstructions: |
  You are an expert assistant...
selfCritiqueInstructions: |
  Score your evaluation quality 1-100 based on:
  - Technical accuracy (40%)
  - Completeness (30%)
  - Actionability (30%)
readme: |
  # My Agent
  
  This agent is designed to..."
                    className="h-96 w-full resize-none rounded-lg border border-gray-300 p-4 font-mono text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    disabled={isCreatingFromYaml}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <Button
                    onClick={handleCreateFromYaml}
                    disabled={!canCreateFromYaml || isCreatingFromYaml}
                    className="flex items-center gap-2"
                  >
                    {isCreatingFromYaml ? "Creating..." : "Create Agent"}
                  </Button>

                  <Link href="/agents">
                    <Button variant="secondary">Cancel</Button>
                  </Link>
                </div>
              </div>

              {/* Validation and Preview Section */}
              <div className="space-y-6">
                {/* Validation Status */}
                {validation && (
                  <div
                    className={`rounded-lg border p-4 ${
                      !validation.isValidYaml
                        ? "border-red-200 bg-red-50"
                        : !validation.hasRequiredFields
                          ? "border-yellow-200 bg-yellow-50"
                          : "border-green-200 bg-green-50"
                    }`}
                  >
                    <h3 className="mb-3 text-lg font-medium">Validation Results</h3>

                    {/* YAML Syntax */}
                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        {validation.isValidYaml ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircleIcon className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm font-medium">
                          YAML Syntax: {validation.isValidYaml ? "Valid" : "Invalid"}
                        </span>
                      </div>
                      {validation.yamlError && (
                        <p className="ml-6 mt-1 text-sm text-red-600">
                          {validation.yamlError}
                        </p>
                      )}
                    </div>

                    {/* Required Fields */}
                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        {validation.hasRequiredFields ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircleIcon className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm font-medium">
                          Required Fields:{" "}
                          {validation.hasRequiredFields ? "Complete" : "Missing"}
                        </span>
                      </div>
                      {validation.missingFields.length > 0 && (
                        <p className="ml-6 mt-1 text-sm text-red-600">
                          Missing: {validation.missingFields.join(", ")}
                        </p>
                      )}
                    </div>

                    {/* Warnings */}
                    {validation.warnings.length > 0 && (
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium">Warnings</span>
                        </div>
                        <ul className="ml-6 space-y-1 text-sm text-yellow-700">
                          {validation.warnings.map((warning, index) => (
                            <li key={index}>• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Preview */}
                {validation?.isValidYaml && validation.parsedData && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <h3 className="mb-3 text-lg font-medium">Import Preview</h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Name:</span>
                        <p className="mt-1 text-gray-900">
                          {validation.parsedData.name || "Not provided"}
                        </p>
                      </div>


                      <div>
                        <span className="font-medium text-gray-700">
                          Description:
                        </span>
                        <p className="mt-1 text-gray-900">
                          {validation.parsedData.description || "Not provided"}
                        </p>
                      </div>

                      {validation.parsedData.primaryInstructions && (
                        <div>
                          <span className="font-medium text-gray-700">
                            Instructions:
                          </span>
                          <p className="mt-1 max-h-24 overflow-y-auto rounded border bg-white p-2 text-gray-900">
                            {validation.parsedData.primaryInstructions.slice(0, 200)}
                            {validation.parsedData.primaryInstructions.length > 200 &&
                              "..."}
                          </p>
                        </div>
                      )}

                      {validation.parsedData.selfCritiqueInstructions && (
                        <div>
                          <span className="font-medium text-gray-700">
                            Self-Critique Instructions:
                          </span>
                          <p className="mt-1 rounded border bg-white p-2 text-gray-900">
                            {validation.parsedData.selfCritiqueInstructions.slice(
                              0,
                              100
                            )}
                            {validation.parsedData.selfCritiqueInstructions.length >
                              100 && "..."}
                          </p>
                        </div>
                      )}

                      {validation.parsedData.readme && (
                        <div>
                          <span className="font-medium text-gray-700">
                            README:
                          </span>
                          <p className="mt-1 max-h-24 overflow-y-auto rounded border bg-white p-2 text-gray-900">
                            {validation.parsedData.readme.slice(0, 200)}
                            {validation.parsedData.readme.length > 200 && "..."}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Field Reference */}
                <div className="rounded-lg border border-gray-200 bg-blue-50 p-4">
                  <h3 className="mb-3 text-lg font-medium">Supported Fields</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-blue-800">Required:</span>
                      <p className="text-blue-700">{REQUIRED_FIELDS.join(", ")}</p>
                    </div>
                    <div>
                      <span className="font-medium text-blue-800">Optional:</span>
                      <p className="text-blue-700">{OPTIONAL_FIELDS.join(", ")}</p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <p className="text-blue-700">
                        Need help? Check out the{" "}
                        <Link href="/agents/readme" className="font-medium underline hover:text-blue-800">
                          complete agent documentation
                        </Link>{" "}
                        for detailed field descriptions and examples.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : mode === "github" ? (
            // GitHub Mode
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* Input Section */}
              <div className="space-y-6">
                <div>
                  <label
                    htmlFor="github-url"
                    className="block text-sm font-medium text-gray-700"
                  >
                    GitHub Repository URL
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="github-url"
                      value={githubUrl}
                      onChange={(e) => {
                        setGithubUrl(e.target.value);
                        setGithubImportError(null);
                      }}
                      placeholder="https://github.com/username/agent-repo"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      disabled={isImportingFromGithub}
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Enter the URL of a GitHub repository containing an agent configuration file
                  </p>
                </div>

                {githubImportError && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="flex">
                      <XCircleIcon className="h-5 w-5 text-red-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">Import Error</h3>
                        <div className="mt-2 text-sm text-red-700">
                          {githubImportError}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <Button
                    onClick={handleImportFromGithub}
                    disabled={!githubUrl || isImportingFromGithub}
                  >
                    {isImportingFromGithub ? "Importing..." : "Import from GitHub"}
                  </Button>
                  <Link href="/agents">
                    <Button variant="secondary">Cancel</Button>
                  </Link>
                </div>
              </div>

              {/* Info Section */}
              <div className="space-y-6">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <h3 className="mb-3 text-lg font-medium">How GitHub Import Works</h3>
                  <div className="space-y-3 text-sm text-gray-700">
                    <p>
                      The importer will look for agent configuration files in your repository:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>agent.yaml, agent.yml, agent.json</li>
                      <li>.roastmypost.yaml, .roastmypost.yml, .roastmypost.json</li>
                      <li>roastmypost.yaml, roastmypost.yml, roastmypost.json</li>
                    </ul>
                    <p className="mt-3">
                      The configuration can reference other files for instructions:
                    </p>
                    <pre className="mt-2 bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`primaryInstructions: ./instructions/primary.md
selfCritiqueInstructions: ./instructions/critique.md`}
                    </pre>
                    <p className="mt-3">
                      If a README.md exists, it will be imported as the agent's documentation.
                    </p>
                    <p className="mt-3">
                      <Link href="/help/github-agents" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        View full documentation →
                      </Link>
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-blue-50 p-4">
                  <h3 className="mb-3 text-lg font-medium">Configuration Format</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-blue-800">Required fields:</span>
                      <p className="text-blue-700">name, description</p>
                    </div>
                    <div>
                      <span className="font-medium text-blue-800">Optional fields:</span>
                      <p className="text-blue-700">
                        primaryInstructions, selfCritiqueInstructions, providesGrades, extendedCapabilityId, readme
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}