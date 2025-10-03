"use client";

import {
  useEffect,
  useState,
} from "react";

import * as yaml from "js-yaml";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";

interface YamlImportClientProps {
  agentId: string;
}

interface ValidationResult {
  isValidYaml: boolean;
  yamlError?: string;
  hasRequiredFields: boolean;
  missingFields: string[];
  extraFields: string[];
  parsedData?: any;
  warnings: string[];
}

interface AgentData {
  name: string;
  description: string;
  primaryInstructions?: string;
  selfCritiqueInstructions?: string;
  providesGrades?: boolean;
  extendedCapabilityId?: string;
  readme?: string;
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

export function YamlImportClient({ agentId }: YamlImportClientProps) {
  const router = useRouter();
  const [yamlText, setYamlText] = useState("");
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Validate YAML in real-time
  useEffect(() => {
    if (!yamlText.trim()) {
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
  }, [yamlText]);

  const handleImport = async () => {
    if (!validation?.isValidYaml || !validation.hasRequiredFields) return;

    setLoading(true);
    try {
      // Extract only the supported fields
      const agentData: AgentData = {
        name: validation.parsedData.name,
        description: validation.parsedData.description,
      };

      // Add optional fields if they exist
      OPTIONAL_FIELDS.forEach((field) => {
        if (validation.parsedData[field] !== undefined) {
          (agentData as any)[field] = validation.parsedData[field];
        }
      });

      // Store the imported data in sessionStorage to pass to edit page
      try {
        const dataToStore = JSON.stringify(agentData);
        sessionStorage.setItem(`importedAgentData_${agentId}`, dataToStore);

        // Verify it was stored correctly
        const verification = sessionStorage.getItem(
          `importedAgentData_${agentId}`
        );
        if (verification !== dataToStore) {
          alert(
            "Warning: Some data may not have been saved due to size limitations. Consider reducing the size of your instructions."
          );
        }
      } catch (_e) {
        alert(
          "Failed to store import data. The content may be too large. Please try reducing the size of your instructions."
        );
        return;
      }

      router.push(`/agents/${agentId}/edit?import=true`);
    } catch (_error) {
      // Error is already handled by setError in the validation process
    } finally {
      setLoading(false);
    }
  };

  const getValidationIcon = () => {
    if (!validation) return null;

    if (!validation.isValidYaml) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    } else if (!validation.hasRequiredFields) {
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    } else {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
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

  const canImport = validation?.isValidYaml && validation.hasRequiredFields;

  return (
    <div className="mx-auto max-w-6xl p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/agents/${agentId}`}
          className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Agent
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          Import Agent from YAML
        </h1>
        <p className="mt-2 text-gray-600">
          Paste YAML configuration below. Real-time validation will show you any
          issues and preview what will be imported.
        </p>
      </div>

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
              disabled={loading}
            />
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={handleImport}
              disabled={!canImport || loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {loading ? "Importing..." : "Import to Agent"}
            </Button>

            <Link href={`/agents/${agentId}`}>
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
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
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
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
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
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
