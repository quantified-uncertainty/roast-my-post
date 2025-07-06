"use client";

import {
  use,
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import { logger } from "@/lib/logger";
import { useRouter } from "next/navigation";
import {
  FormProvider,
  useForm,
} from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

import {
  type DocumentInput,
  documentSchema,
} from "../../../docs/new/schema";
import { updateDocument } from "./actions";

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
    name: "importUrl",
    label: "Import URL",
    type: "text",
    placeholder: "Original URL where this document was imported from",
  },
];

type Props = {
  params: Promise<{
    docId: string;
  }>;
};

export default function EditDocumentPage({ params }: Props) {
  const router = useRouter();
  const resolvedParams = use(params);
  const docId = resolvedParams.docId;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [evaluationCount, setEvaluationCount] = useState(0);
  const [pendingFormData, setPendingFormData] = useState<DocumentInput | null>(null);

  const methods = useForm<DocumentInput>({
    defaultValues: {
      title: "",
      authors: "",
      content: "",
      urls: "",
      platforms: "",
      importUrl: "",
    },
  });

  const {
    handleSubmit,
    formState: { errors, isSubmitting },
    setError: setFormError,
    reset,
  } = methods;

  useEffect(() => {
    // Fetch the document data from the server
    const fetchDocument = async () => {
      try {
        const response = await fetch(`/api/documents/${docId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch document: ${response.statusText}`);
        }

        const document = await response.json();

        // Convert the document data to form format
        reset({
          title: document.title || "",
          authors: document.author || "",
          content: document.content || "",
          urls: document.url || "",
          platforms:
            document.platforms && document.platforms.length > 0
              ? document.platforms.join(", ")
              : "",
          importUrl: document.importUrl || "",
        });

        // Count the number of evaluations
        const evalCount = document.reviews?.length || 0;
        setEvaluationCount(evalCount);

        setLoading(false);
      } catch (err) {
        logger.error('Error fetching document:', err);
        setError(
          err instanceof Error ? err.message : "Failed to load document data"
        );
        setLoading(false);
      }
    };

    fetchDocument();
  }, [docId, reset]);

  const handleConfirmUpdate = async () => {
    if (!pendingFormData) return;
    
    setShowWarningDialog(false);
    
    try {
      const updateResult = await updateDocument({
        ...pendingFormData,
        docId: docId,
      });

      if (!updateResult.success) {
        setFormError("root", {
          message: updateResult.error || "Failed to update document",
        });
        return;
      }

      // Redirect to document page
      router.push(`/docs/${docId}/reader`);
      router.refresh();
    } catch (error) {
      logger.error('Error updating document:', error);
      setFormError("root", { message: "An unexpected error occurred" });
    }
  };

  const handleCancelUpdate = () => {
    setShowWarningDialog(false);
    setPendingFormData(null);
  };

  const onSubmit = async (data: DocumentInput) => {
    try {
      const result = documentSchema.parse(data);
      
      // If there are evaluations, show warning dialog
      if (evaluationCount > 0 && !showWarningDialog) {
        setPendingFormData(result);
        setShowWarningDialog(true);
        return;
      }

      // Use updateDocument for editing with the docId explicitly included
      const updateResult = await updateDocument({
        ...result,
        docId: docId, // Use the resolved docId
      });

      if (!updateResult.success) {
        setFormError("root", {
          message: updateResult.error || "Failed to update document",
        });
        return;
      }

      // Redirect to document page
      router.push(`/docs/${docId}/reader`);
      router.refresh(); // Force a refresh to show the updated data
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          if (err.path[0]) {
            setFormError(err.path[0].toString() as keyof DocumentInput, {
              message: err.message,
            });
          }
        });
      } else {
        logger.error('Error submitting form:', error);
        setFormError("root", { message: "An unexpected error occurred" });
      }
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-lg font-semibold">
            Loading document data...
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
                <Link href={`/docs/${docId}`}>
                  <Button>Back to Document</Button>
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
            <h1 className="text-2xl font-semibold text-gray-900">
              Edit Document
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Update your document (this will create a new version)
            </p>
          </div>

          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {formFields.map((field) => (
                <FormField
                  key={field.name}
                  name={field.name}
                  label={field.label}
                  required={field.required}
                  error={errors[field.name]}
                >
                  <div>
                    <input
                      {...methods.register(field.name)}
                      type={field.type}
                      id={field.name}
                      className={`form-input w-full ${errors[field.name] ? "border-red-500" : ""}`}
                      placeholder={field.placeholder}
                    />
                    {field.name === "importUrl" && (
                      <p className="mt-2 text-sm text-gray-600">
                        This is the URL where the document was originally
                        imported from. It's used for re-importing the document
                        when you want to fetch the latest version.
                      </p>
                    )}
                  </div>
                </FormField>
              ))}

              <FormField
                name="content"
                label="Content"
                required
                error={errors.content}
              >
                <textarea
                  {...methods.register("content")}
                  id="content"
                  rows={15}
                  className={`form-input w-full ${errors.content ? "border-red-500" : ""}`}
                  placeholder="Document content in Markdown format"
                />
              </FormField>

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
                <Link href={`/docs/${docId}`}>
                  <Button variant="secondary">Cancel</Button>
                </Link>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Update Document"}
                </Button>
              </div>
            </form>
          </FormProvider>

          {/* Warning Dialog */}
          {showWarningDialog && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex min-h-screen items-center justify-center p-4 text-center">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCancelUpdate} />
                
                <div className="relative inline-block rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                      <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                      <h3 className="text-base font-semibold leading-6 text-gray-900">
                        Update Document
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Updating this document will invalidate {evaluationCount} existing evaluation{evaluationCount !== 1 ? 's' : ''}. 
                          They will be automatically re-run after saving, which will incur API costs. Continue?
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button
                      type="button"
                      className="inline-flex w-full justify-center rounded-md bg-yellow-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-yellow-500 sm:ml-3 sm:w-auto"
                      onClick={handleConfirmUpdate}
                    >
                      Continue with update
                    </button>
                    <button
                      type="button"
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                      onClick={handleCancelUpdate}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
