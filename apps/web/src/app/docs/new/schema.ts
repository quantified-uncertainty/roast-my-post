import { z } from "zod";

// Content validation constants
export const CONTENT_MIN_CHARS = 30;
export const CONTENT_MAX_WORDS = 50000;

// Schema for form validation
export const documentSchema = z.object({
  title: z.string().optional(),
  authors: z.string().optional(),
  content: z.string()
    .min(CONTENT_MIN_CHARS, `Content must be at least ${CONTENT_MIN_CHARS} characters`)
    .refine((content) => {
      // Count words (split by whitespace)
      const trimmed = content.trim();
      const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
      return wordCount <= CONTENT_MAX_WORDS;
    }, `Content must not exceed ${CONTENT_MAX_WORDS.toLocaleString()} words`),
  urls: z.string().optional(),
  platforms: z.string().optional(),
  importUrl: z.string().optional(),
  isPrivate: z.boolean().optional().default(false),
});

export type DocumentInput = z.infer<typeof documentSchema>;
