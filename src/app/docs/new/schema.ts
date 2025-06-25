import { z } from "zod";

// Schema for form validation
export const documentSchema = z.object({
  title: z.string().optional(),
  authors: z.string().optional(),
  content: z.string()
    .min(30, "Content must be at least 30 characters")
    .refine((content) => {
      // Count words (split by whitespace)
      const wordCount = content.trim().split(/\s+/).length;
      return wordCount <= 50000;
    }, "Content must not exceed 50,000 words"),
  urls: z.string().optional(),
  platforms: z.string().optional(),
  importUrl: z.string().optional(),
});

export type DocumentInput = z.infer<typeof documentSchema>;
