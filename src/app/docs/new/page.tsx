"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { createDocument } from "./actions";
import { type DocumentInput, documentSchema } from "./schema";

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
      // Validate with zod
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
            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700"
              >
                Title <span className="text-red-500">*</span>
              </label>
              <input
                {...register("title")}
                type="text"
                id="title"
                className={`form-input ${errors.title ? "border-red-500" : ""}`}
                placeholder="Document title"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.title.message}
                </p>
              )}
            </div>

            {/* Authors */}
            <div>
              <label
                htmlFor="authors"
                className="block text-sm font-medium text-gray-700"
              >
                Authors <span className="text-red-500">*</span>
              </label>
              <input
                {...register("authors")}
                type="text"
                id="authors"
                className={`form-input ${errors.authors ? "border-red-500" : ""}`}
                placeholder="Author names (comma separated)"
              />
              {errors.authors && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.authors.message}
                </p>
              )}
            </div>

            {/* URLs */}
            <div>
              <label
                htmlFor="urls"
                className="block text-sm font-medium text-gray-700"
              >
                URLs
              </label>
              <input
                {...register("urls")}
                type="text"
                id="urls"
                className={`form-input ${errors.urls ? "border-red-500" : ""}`}
                placeholder="Related URLs (comma separated)"
              />
            </div>

            {/* Platforms */}
            <div>
              <label
                htmlFor="platforms"
                className="block text-sm font-medium text-gray-700"
              >
                Platforms
              </label>
              <input
                {...register("platforms")}
                type="text"
                id="platforms"
                className={`form-input ${errors.platforms ? "border-red-500" : ""}`}
                placeholder="Platforms (e.g., LessWrong, EA Forum)"
              />
            </div>

            {/* Intended Agents */}
            <div>
              <label
                htmlFor="intendedAgents"
                className="block text-sm font-medium text-gray-700"
              >
                Intended Agents
              </label>
              <input
                {...register("intendedAgents")}
                type="text"
                id="intendedAgents"
                className={`form-input ${errors.intendedAgents ? "border-red-500" : ""}`}
                placeholder="Agent IDs (comma separated)"
              />
            </div>

            {/* Content */}
            <div>
              <label
                htmlFor="content"
                className="block text-sm font-medium text-gray-700"
              >
                Content <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register("content")}
                id="content"
                rows={15}
                className={`form-input ${errors.content ? "border-red-500" : ""}`}
                placeholder="Document content in Markdown format"
              />
              {errors.content && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.content.message}
                </p>
              )}
            </div>

            {/* Form Error */}
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

            {/* Buttons */}
            <div className="flex justify-end gap-3">
              <Link
                href="/docs"
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Save Document"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
