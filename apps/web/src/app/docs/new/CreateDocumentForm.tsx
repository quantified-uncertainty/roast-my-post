"use client";

import { useState, useEffect } from "react";
import { logger } from "@/infrastructure/logging/logger";
import Link from "next/link";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { AgentBadges } from "@/components/AgentBadges";
import { 
  LinkIcon, 
  DocumentTextIcon,
  CheckIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";

import { createDocument } from "./actions";
import { importDocument } from "../import/actions";
import { type DocumentInput, documentSchema, CONTENT_MIN_CHARS, CONTENT_MAX_WORDS } from "./schema";
import { sortAgentsByBadgeStatus } from "@/shared/utils/agentSorting";
import { useContentValidation } from "./hooks/useContentValidation";

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

export default function CreateDocumentForm() {
  const [mode, setMode] = useState<"import" | "manual">("import");
  const [importUrl, setImportUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  
  // Agent selection state
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);

  const methods = useForm<DocumentInput>({
    resolver: zodResolver(documentSchema) as any,
    defaultValues: {
      title: "",
      authors: "",
      content: "",
      urls: "",
      platforms: "",
      isPrivate: false,
    },
  });

  const {
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    watch,
  } = methods;
  
  // Watch content field for real-time validation
  const content = watch("content");
  const { charCount, wordCount, hasMinChars, hasMaxWords } = useContentValidation(content);

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
        // Start with no agents selected
        // Users can manually select which evaluations they want to run
      } catch (error) {
        logger.error('Error fetching agents:', error);
      } finally {
        setLoadingAgents(false);
      }
    };
    fetchAgents();
  }, []);

  const toggleAgent = (agentId: string) => {
    setSelectedAgentIds(prev => 
      prev.includes(agentId) 
        ? prev.filter(id => id !== agentId)
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
      await importDocument(importUrl.trim(), selectedAgentIds);
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
          const field = typeof err.path?.[0] === "string" ? (err.path[0] as keyof DocumentInput) : undefined;
          if (field) {
            setError(field, { message: err.message });
            hasFieldError = true;
          }
        });
        if (!hasFieldError) {
          setError("root", { message: "Please fix the validation errors." });
        }
      } else {
        logger.error('Error submitting form:', error);
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
                className={`flex-1 flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
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
                className={`flex-1 flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
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
              </div>

              {/* Agent Selection */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Run evaluations after import
                  </label>
                </div>
                
                {loadingAgents ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-lg border border-gray-200 p-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-20 bg-gray-100 rounded-lg"></div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-lg border border-gray-200 p-4 max-h-96 overflow-y-auto">
                    {agents.map(agent => (
                      <label
                        key={agent.id}
                        className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-gray-200 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedAgentIds.includes(agent.id)}
                          onChange={() => toggleAgent(agent.id)}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
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
                          <div className="text-sm text-gray-600 mt-1">{agent.description}</div>
                        </div>
                        {selectedAgentIds.includes(agent.id) && (
                          <CheckIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-1" />
                        )}
                      </label>
                    ))}
                  </div>
                )}
                
                {selectedAgentIds.length > 0 && (
                  <p className="text-sm text-gray-600">
                    {selectedAgentIds.length} evaluation{selectedAgentIds.length !== 1 ? 's' : ''} will be queued after import
                  </p>
                )}
              </div>

              {importError && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700">
                    <p className="font-medium">Import failed</p>
                    <p className="mt-1">{importError}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Link href="/docs">
                  <Button variant="secondary">Cancel</Button>
                </Link>
                <Button
                  type="submit"
                  disabled={isImporting || !importUrl.trim()}
                >
                  {isImporting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                      Importing...
                    </div>
                  ) : (
                    selectedAgentIds.length > 0 
                      ? `Import & Run ${selectedAgentIds.length} Evaluation${selectedAgentIds.length !== 1 ? 's' : ''}`
                      : "Import Document"
                  )}
                </Button>
              </div>

              {isImporting && (
                <div className="mt-4 text-center text-sm text-gray-600">
                  Importing may take 10-20 seconds. Please be patient while we process
                  your document.
                </div>
              )}

              <div className="mt-6 text-sm text-gray-600">
                <p>Supported platforms:</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>LessWrong</li>
                  <li>EA Forum</li>
                  <li>Medium</li>
                  <li>Substack</li>
                  <li>General web articles</li>
                </ul>
              </div>
            </form>
          ) : (
            // Manual Mode
            <FormProvider {...methods}>
              <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
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
                        <span className={`${!hasMinChars && charCount > 0 ? "text-red-600" : "text-gray-500"}`}>
                          {charCount} characters {!hasMinChars && charCount > 0 && `(min: ${CONTENT_MIN_CHARS})`}
                        </span>
                        <span className={`${!hasMaxWords && wordCount > 0 ? "text-red-600" : "text-gray-500"}`}>
                          {wordCount.toLocaleString()} words {!hasMaxWords && `(max: ${CONTENT_MAX_WORDS.toLocaleString()})`}
                        </span>
                      </div>
                      {content && (
                        <div>
                          {!hasMinChars && (
                            <span className="text-red-600">Need {CONTENT_MIN_CHARS - charCount} more characters</span>
                          )}
                          {hasMinChars && hasMaxWords && (
                            <span className="text-green-600">✓ Valid length</span>
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

                {/* Privacy Toggle */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-900">
                    Document Privacy
                  </label>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        {...methods.register("isPrivate")}
                        type="checkbox"
                        className="mt-1 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex items-start gap-2">
                        <LockClosedIcon className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">Make this document private</div>
                          <div className="text-xs text-gray-500">Only you will be able to view this document. Public by default.</div>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-900">
                    Evaluations to run after creation
                  </h3>
                  
                  {loadingAgents ? (
                    <div className="flex items-center justify-center p-4">
                      <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-gray-600"></div>
                    </div>
                  ) : agents.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No evaluations available</p>
                  ) : (
                    <div className="space-y-2">
                      {agents.map((agent) => (
                        <label
                          key={agent.id}
                          className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-gray-200 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedAgentIds.includes(agent.id)}
                            onChange={() => toggleAgent(agent.id)}
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1 min-w-0">
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
                            <div className="text-sm text-gray-600 mt-1">{agent.description}</div>
                          </div>
                          {selectedAgentIds.includes(agent.id) && (
                            <CheckIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-1" />
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                  
                  {selectedAgentIds.length > 0 && (
                    <p className="text-sm text-gray-600">
                      {selectedAgentIds.length} evaluation{selectedAgentIds.length !== 1 ? 's' : ''} will be queued after creation
                    </p>
                  )}
                </div>

                {errors.root && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="flex">
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                          Error
                        </h3>
                        <div className="mt-2 text-sm text-red-700">
                          {errors.root.message}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <Link href="/docs">
                    <Button variant="secondary">Cancel</Button>
                  </Link>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : (
                      selectedAgentIds.length > 0 
                        ? `Save & Run ${selectedAgentIds.length} Evaluation${selectedAgentIds.length !== 1 ? 's' : ''}`
                        : "Save Document"
                    )}
                  </Button>
                </div>
              </form>
            </FormProvider>
          )}
        </div>
      </div>
    </div>
  );
}