"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

import { AgentBadges } from "@/components/AgentBadges";
import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { logger } from "@/infrastructure/logging/logger";
import { sortAgentsByBadgeStatus } from "@/shared/utils/agentSorting";
import {
  CheckIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  LinkIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";

import { importDocument } from "../import/actions";
import { createDocument } from "./actions";
import { useContentValidation } from "./hooks/useContentValidation";
import {
  CONTENT_MAX_WORDS,
  CONTENT_MIN_CHARS,
  type DocumentInput,
  documentSchema,
} from "./schema";

interface FormFieldConfig {
  name: keyof DocumentInput;
  label: string;
  required?: boolean;
  type: "text" | "textarea";
  placeholder: string;
}

const formFields: FormFieldConfig[] = [
  {
    name: "title",
    label: "Title",
    required: false,
    type: "text",
    placeholder: "Document title (optional - will be generated if empty)",
  },
  {
    name: "authors",
    label: "Authors",
    required: false,
    type: "text",
    placeholder: "Author names (comma separated, optional)",
  },
  {
    name: "urls",
    label: "URLs",
    type: "text",
    placeholder: "Related URLs (comma separated)",
  },
  {
    name: "platforms",
    label: "Platforms",
    type: "text",
    placeholder: "Platforms (e.g., LessWrong, EA Forum)",
  },
];

interface Agent {
  id: string;
  name: string;
  description: string;
  isRecommended?: boolean;
  isDeprecated?: boolean;
  isSystemManaged?: boolean;
  providesGrades?: boolean;
}

// ============= EXTRACTED COMPONENTS =============

interface PrivacyToggleProps {
  isPrivate: boolean;
  onChange: (value: boolean) => void;
  useRegister?: any; // For react-hook-form register
}

function PrivacyToggle({
  isPrivate,
  onChange,
  useRegister,
}: PrivacyToggleProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-900">
        Document Privacy
      </label>
      <RadioGroup
        value={isPrivate ? "private" : "public"}
        onValueChange={(value: string) => onChange(value === "private")}
        className="flex gap-6"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="public" id="create-public" />
          <Label
            htmlFor="create-public"
            className="flex cursor-pointer items-center gap-2"
          >
            <GlobeAltIcon className="h-4 w-4 text-gray-500" />
            <div>
              <div className="text-sm font-medium">Public</div>
              <div className="text-xs text-gray-500">
                Anyone can view this document
              </div>
            </div>
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="private" id="create-private" />
          <Label
            htmlFor="create-private"
            className="flex cursor-pointer items-center gap-2"
          >
            <LockClosedIcon className="h-4 w-4 text-gray-500" />
            <div>
              <div className="text-sm font-medium">Private</div>
              <div className="text-xs text-gray-500">
                Only you can view this document
              </div>
            </div>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}

interface AgentSelectorProps {
  agents: Agent[];
  selectedAgentIds: string[];
  onToggleAgent: (agentId: string) => void;
  loading: boolean;
  title?: string;
  actionText?: string;
  layout?: "grid" | "list";
}

function AgentSelector({
  agents,
  selectedAgentIds,
  onToggleAgent,
  loading,
  title = "Evaluations to run",
  actionText = "will be queued",
  layout = "grid",
}: AgentSelectorProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          {title}
        </label>
        <div className="flex items-center justify-center rounded-lg border border-gray-200 p-8">
          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-gray-600"></div>
        </div>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          {title}
        </label>
        <p className="text-sm italic text-gray-500">No evaluations available</p>
      </div>
    );
  }

  const containerClass =
    layout === "grid"
      ? "grid grid-cols-1 md:grid-cols-2 gap-3 rounded-lg border border-gray-200 p-4 max-h-96 overflow-y-auto"
      : "space-y-2 rounded-lg border border-gray-200 p-4 max-h-96 overflow-y-auto";

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">{title}</label>

      <div className={containerClass}>
        {agents.map((agent) => (
          <label
            key={agent.id}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-100 p-3 transition-colors hover:border-gray-200 hover:bg-gray-50"
          >
            <input
              type="checkbox"
              checked={selectedAgentIds.includes(agent.id)}
              onChange={() => onToggleAgent(agent.id)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{agent.name}</span>
                <AgentBadges
                  isDeprecated={agent.isDeprecated}
                  isRecommended={agent.isRecommended}
                  isSystemManaged={agent.isSystemManaged}
                  providesGrades={agent.providesGrades}
                  size="sm"
                />
              </div>
              <div className="mt-1 text-sm text-gray-600">
                {agent.description}
              </div>
            </div>
            {selectedAgentIds.includes(agent.id) && (
              <CheckIcon className="mt-1 h-5 w-5 flex-shrink-0 text-blue-600" />
            )}
          </label>
        ))}
      </div>

      {selectedAgentIds.length > 0 && (
        <p className="text-sm text-gray-600">
          {selectedAgentIds.length} evaluation
          {selectedAgentIds.length !== 1 ? "s" : ""} {actionText}
        </p>
      )}
    </div>
  );
}

interface ErrorAlertProps {
  title?: string;
  message: string;
}

function ErrorAlert({ title = "Error", message }: ErrorAlertProps) {
  return (
    <div className="rounded-md bg-red-50 p-4">
      <div className="text-sm text-red-700">
        <p className="font-medium">{title}</p>
        <p className="mt-1">{message}</p>
      </div>
    </div>
  );
}

interface SubmitButtonProps {
  isSubmitting: boolean;
  selectedAgentCount: number;
  baseText: string;
  submittingText: string;
  disabled?: boolean;
}

function SubmitButton({
  isSubmitting,
  selectedAgentCount,
  baseText,
  submittingText,
  disabled = false,
}: SubmitButtonProps) {
  const buttonText =
    selectedAgentCount > 0
      ? `${baseText} & Run ${selectedAgentCount} Evaluation${selectedAgentCount !== 1 ? "s" : ""}`
      : baseText;

  return (
    <Button type="submit" disabled={disabled || isSubmitting}>
      {isSubmitting ? (
        <div className="flex items-center justify-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
          {submittingText}
        </div>
      ) : (
        buttonText
      )}
    </Button>
  );
}

// ============= MAIN COMPONENT =============

export default function CreateDocumentForm() {
  const [mode, setMode] = useState<"import" | "manual">("import");
  const [importUrl, setImportUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importIsPrivate, setImportIsPrivate] = useState(true); // Default to private

  // Agent selection state
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);

  const methods = useForm({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      title: "",
      authors: "",
      content: "",
      urls: "",
      platforms: "",
      isPrivate: true, // Default to private
    },
  });

  const {
    formState: { errors, isSubmitting },
    setError,
    watch,
  } = methods;

  // Watch content field for real-time validation
  const content = watch("content");
  const { charCount, wordCount, hasMinChars, hasMaxWords } =
    useContentValidation(content);

  // Fetch available agents
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch("/api/agents");
        if (!response.ok) throw new Error("Failed to fetch agents");
        const data = await response.json();
        const fetchedAgents = data.agents || [];

        // Sort agents: recommended first, then regular, then deprecated
        const sortedAgents = sortAgentsByBadgeStatus<Agent>(fetchedAgents);
        setAgents(sortedAgents);
      } catch (error) {
        logger.error("Error fetching agents:", error);
      } finally {
        setLoadingAgents(false);
      }
    };
    fetchAgents();
  }, []);

  const toggleAgent = (agentId: string) => {
    setSelectedAgentIds((prev) =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!importUrl.trim()) {
      setImportError("Please enter a URL");
      return;
    }

    try {
      setIsImporting(true);
      setImportError(null);
      await importDocument(importUrl.trim(), selectedAgentIds, importIsPrivate);
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Failed to import document"
      );
    } finally {
      setIsImporting(false);
    }
  };

  const onSubmit = async (data: DocumentInput) => {
    try {
      const result = documentSchema.parse(data);
      await createDocument(result, selectedAgentIds);
    } catch (error) {
      // Ignore Next.js redirect errors
      if (error instanceof Error && error.message === "NEXT_REDIRECT") {
        return;
      }

      if (error instanceof z.ZodError) {
        let hasFieldError = false;
        error.errors.forEach((err) => {
          const field =
            typeof err.path?.[0] === "string"
              ? (err.path[0] as keyof DocumentInput)
              : undefined;
          if (field) {
            setError(field, { message: err.message });
            hasFieldError = true;
          }
        });
        if (!hasFieldError) {
          setError("root", { message: "Please fix the validation errors." });
        }
      } else {
        logger.error("Error submitting form:", error);
        setError("root", { message: "An unexpected error occurred" });
      }
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">
              Create New Document
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Import from a URL or create manually
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="mb-8">
            <div className="flex rounded-lg bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setMode("import")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  mode === "import"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <LinkIcon className="h-4 w-4" />
                Import via URL
              </button>
              <button
                type="button"
                onClick={() => setMode("manual")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  mode === "manual"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <DocumentTextIcon className="h-4 w-4" />
                Submit Text
              </button>
            </div>
          </div>

          {mode === "import" ? (
            // Import Mode
            <form onSubmit={handleImport} className="space-y-6">
              <div>
                <label
                  htmlFor="url"
                  className="block text-sm font-medium text-gray-700"
                >
                  URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  id="url"
                  name="url"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  required
                  disabled={isImporting}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                <div className="mt-6 text-sm text-gray-600">
                  Supports LessWrong and the EA Forum. Attempts to fetch article
                  content from other platforms.
                </div>
              </div>

              <PrivacyToggle
                isPrivate={importIsPrivate}
                onChange={setImportIsPrivate}
              />

              <AgentSelector
                agents={agents}
                selectedAgentIds={selectedAgentIds}
                onToggleAgent={toggleAgent}
                loading={loadingAgents}
                title="Run evaluations after import"
                actionText="will be queued after import"
                layout="grid"
              />

              {importError && (
                <ErrorAlert title="Import failed" message={importError} />
              )}

              <div className="flex justify-end gap-3">
                <Link href="/docs">
                  <Button variant="secondary">Cancel</Button>
                </Link>
                <SubmitButton
                  isSubmitting={isImporting}
                  selectedAgentCount={selectedAgentIds.length}
                  baseText="Import Document"
                  submittingText="Importing..."
                  disabled={!importUrl.trim()}
                />
              </div>

              {isImporting && (
                <div className="mt-4 text-center text-sm text-gray-600">
                  Importing may take 10-20 seconds. Please be patient while we
                  process your document.
                </div>
              )}
            </form>
          ) : (
            // Manual Mode
            <FormProvider {...methods}>
              <form
                onSubmit={methods.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  name="content"
                  label="Content"
                  required
                  error={errors.content}
                >
                  <div className="space-y-2">
                    <textarea
                      {...methods.register("content")}
                      id="content"
                      rows={15}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${errors.content ? "border-red-500" : ""}`}
                      placeholder="Document content in Markdown format"
                    />
                    <div className="flex justify-between text-sm">
                      <div className="space-x-4">
                        <span
                          className={`${!hasMinChars && charCount > 0 ? "text-red-600" : "text-gray-500"}`}
                        >
                          {charCount} characters{" "}
                          {!hasMinChars &&
                            charCount > 0 &&
                            `(min: ${CONTENT_MIN_CHARS})`}
                        </span>
                        <span
                          className={`${!hasMaxWords && wordCount > 0 ? "text-red-600" : "text-gray-500"}`}
                        >
                          {wordCount.toLocaleString()} words{" "}
                          {!hasMaxWords &&
                            `(max: ${CONTENT_MAX_WORDS.toLocaleString()})`}
                        </span>
                      </div>
                      {content && (
                        <div>
                          {!hasMinChars && (
                            <span className="text-red-600">
                              Need {CONTENT_MIN_CHARS - charCount} more
                              characters
                            </span>
                          )}
                          {hasMinChars && hasMaxWords && (
                            <span className="text-green-600">
                              ✓ Valid length
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </FormField>

                {formFields.map((field) => (
                  <FormField
                    key={field.name}
                    name={field.name}
                    label={field.label}
                    required={field.required}
                    error={errors[field.name]}
                  >
                    <input
                      {...methods.register(field.name)}
                      type={field.type}
                      id={field.name}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${errors[field.name] ? "border-red-500" : ""}`}
                      placeholder={field.placeholder}
                    />
                  </FormField>
                ))}

                <FormField
                  name="submitterNotes"
                  label="Submitter Notes (Optional)"
                  error={errors.submitterNotes}
                >
                  <textarea
                    {...methods.register("submitterNotes")}
                    id="submitterNotes"
                    rows={4}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${errors.submitterNotes ? "border-red-500" : ""}`}
                    placeholder="Add any context or notes for readers. This will be displayed to readers but NOT included in AI evaluations."
                  />
                  <p className="mt-2 text-sm text-gray-600">
                    These notes provide context for human readers but are not included in AI evaluations.
                  </p>
                </FormField>

                <PrivacyToggle
                  isPrivate={methods.watch("isPrivate") || false}
                  onChange={(value) => methods.setValue("isPrivate", value)}
                />

                <AgentSelector
                  agents={agents}
                  selectedAgentIds={selectedAgentIds}
                  onToggleAgent={toggleAgent}
                  loading={loadingAgents}
                  title="Evaluations to run after creation"
                  actionText="will be queued after creation"
                  layout="list"
                />

                {errors.root && (
                  <ErrorAlert
                    message={errors.root.message || "An error occurred"}
                  />
                )}

                <div className="flex justify-end gap-3">
                  <Link href="/docs">
                    <Button variant="secondary">Cancel</Button>
                  </Link>
                  <SubmitButton
                    isSubmitting={isSubmitting}
                    selectedAgentCount={selectedAgentIds.length}
                    baseText="Save Document"
                    submittingText="Saving..."
                  />
                </div>
              </form>
            </FormProvider>
          )}
        </div>
      </div>
    </div>
  );
}
