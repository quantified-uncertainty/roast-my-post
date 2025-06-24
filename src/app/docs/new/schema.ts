import { z } from "zod";

// Schema for form validation
export const documentSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  authors: z.string(),
  content: z.string().min(50, "Content must be at least 50 characters"),
  urls: z.string().optional(),
  platforms: z.string().optional(),
  importUrl: z.string().optional(),
});

export type DocumentInput = z.infer<typeof documentSchema>;
