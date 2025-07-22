"use client";

import { useEffect, useState } from "react";
import * as yaml from "js-yaml";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

type YamlValue = string | number | boolean | null | YamlObject | YamlArray;
type YamlObject = { [key: string]: YamlValue };
type YamlArray = YamlValue[];

interface YamlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (isValid: boolean, parsed?: YamlObject) => void;
  placeholder?: string;
  height?: string;
  disabled?: boolean;
  requiredFields?: string[];
  optionalFields?: string[];
}

interface ValidationResult {
  isValidYaml: boolean;
  yamlError?: string;
  hasRequiredFields: boolean;
  missingFields: string[];
  extraFields: string[];
  parsedData?: YamlObject;
  warnings: string[];
}

export function YamlEditor({
  value,
  onChange,
  onValidationChange,
  placeholder = "Enter YAML configuration...",
  height = "h-96",
  disabled = false,
  requiredFields = [],
  optionalFields = [],
}: YamlEditorProps) {
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  // Validate YAML in real-time
  useEffect(() => {
    if (!value.trim()) {
      setValidation(null);
      onValidationChange?.(false);
      return;
    }

    try {
      const parsed = yaml.load(value);

      if (!parsed || typeof parsed !== "object") {
        const result = {
          isValidYaml: false,
          yamlError: "YAML must contain an object",
          hasRequiredFields: false,
          missingFields: requiredFields,
          extraFields: [],
          warnings: [],
        };
        setValidation(result);
        onValidationChange?.(false);
        return;
      }

      const parsedObj = parsed as YamlObject;
      const allSupportedFields = [...requiredFields, ...optionalFields];
      const missingFields = requiredFields.filter(
        (field) => !parsedObj[field]
      );
      const extraFields = Object.keys(parsedObj).filter(
        (field) => allSupportedFields.length > 0 && !allSupportedFields.includes(field)
      );

      const warnings: string[] = [];

      // Check for overly long fields
      Object.entries(parsedObj).forEach(([key, val]) => {
        if (typeof val === "string" && val.length > 10000) {
          warnings.push(
            `Field "${key}" is very long (${val.length} characters) - may affect performance`
          );
        }
      });

      // Warn about extra fields that won't be saved
      if (extraFields.length > 0) {
        warnings.push(`These fields won't be saved: ${extraFields.join(", ")}`);
      }

      const result = {
        isValidYaml: true,
        hasRequiredFields: missingFields.length === 0,
        missingFields,
        extraFields,
        parsedData: parsedObj,
        warnings,
      };
      
      setValidation(result);
      onValidationChange?.(result.isValidYaml && result.hasRequiredFields, parsedObj);
    } catch (error) {
      const result = {
        isValidYaml: false,
        yamlError:
          error instanceof Error ? error.message : "Invalid YAML syntax",
        hasRequiredFields: false,
        missingFields: requiredFields,
        extraFields: [],
        warnings: [],
      };
      setValidation(result);
      onValidationChange?.(false);
    }
  }, [value, requiredFields, optionalFields, onValidationChange]);

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

  const isFullHeight = height === "h-full";

  return (
    <div className={`${isFullHeight ? 'h-full flex flex-col' : 'space-y-2'}`}>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full ${isFullHeight ? 'flex-1' : height} resize-none rounded-lg border border-gray-300 p-4 font-mono text-sm focus:border-transparent focus:ring-2 focus:ring-purple-500`}
        disabled={disabled}
      />

      {/* Validation Details */}
      {validation && (
        <div className="space-y-2 text-sm mt-2">
          {validation.yamlError && (
            <p className="text-red-600">{validation.yamlError}</p>
          )}
          
          {validation.missingFields.length > 0 && (
            <p className="text-red-600">
              Missing required fields: {validation.missingFields.join(", ")}
            </p>
          )}
          
          {validation.warnings.map((warning, index) => (
            <p key={index} className="text-yellow-600">
              ⚠️ {warning}
            </p>
          ))}
        </div>
      )}

      {/* Field Reference */}
      {(requiredFields.length > 0 || optionalFields.length > 0) && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs mt-2">
          {requiredFields.length > 0 && (
            <div>
              <span className="font-medium text-gray-700">Required:</span>
              <span className="ml-2 text-gray-600">{requiredFields.join(", ")}</span>
            </div>
          )}
          {optionalFields.length > 0 && (
            <div>
              <span className="font-medium text-gray-700">Optional:</span>
              <span className="ml-2 text-gray-600">{optionalFields.join(", ")}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}