"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";

import { createDocument } from "./actions";
import { type DocumentInput, documentSchema } from "./schema";

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
    required: true,
    type: "text",
    placeholder: "Document title",
  },
  {
    name: "authors",
    label: "Authors",
    required: true,
    type: "text",
    placeholder: "Author names (comma separated)",
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
  {
    name: "intendedAgents",
    label: "Intended Agents",
    type: "text",
    placeholder: "Agent IDs (comma separated)",
  },
];

export default function NewDocumentPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<DocumentInput>({
    defaultValues: {
      title: "",
      authors: "",
      content: "",
      urls: "",
      platforms: "",
      intendedAgents: "",
    },
  });

  const onSubmit = async (data: DocumentInput) => {
    try {
      const result = documentSchema.parse(data);
      const createResult = await createDocument(result);

      if (!createResult) {
        setError("root", { message: "Failed to create document" });
        return;
      }

      if (createResult.data?.success && createResult.data?.document) {
        router.push(`/docs/${createResult.data.slug}`);
      } else {
        const errorMessage =
          createResult.data?.error ||
          (typeof createResult.validationErrors === "string"
            ? createResult.validationErrors
            : "Failed to create document");
        setError("root", { message: errorMessage });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          if (err.path[0]) {
            setError(err.path[0].toString() as keyof DocumentInput, {
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
              Add New Document
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Create a new document to analyze with AI agents
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
                <input
                  {...register(field.name)}
                  type={field.type}
                  id={field.name}
                  className={`form-input ${errors[field.name] ? "border-red-500" : ""}`}
                  placeholder={field.placeholder}
                />
              </FormField>
            ))}

            <FormField
              name="content"
              label="Content"
              required
              error={errors.content}
            >
              <textarea
                {...register("content")}
                id="content"
                rows={15}
                className={`form-input ${errors.content ? "border-red-500" : ""}`}
                placeholder="Document content in Markdown format"
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
              <Link href="/docs">
                <Button variant="secondary">Cancel</Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Document"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
