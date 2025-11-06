import { z } from "zod";
import { MAX_DOCUMENT_WORD_COUNT } from "@roast/domain";

// Content validation constants
export const CONTENT_MIN_CHARS = 30;
export const CONTENT_MAX_WORDS = MAX_DOCUMENT_WORD_COUNT;

// Schema for form validation
export const documentSchema = z.object({
  title: z.string().optional(),
  authors: z.string().optional(),
  content: z.string()
    .min(CONTENT_MIN_CHARS, `Content must be at least ${CONTENT_MIN_CHARS} characters`)
    .refine((content) => {
      // Count words (split by whitespace, filter empty strings for consistency with backend)
      const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
      return wordCount <= CONTENT_MAX_WORDS;
    }, `Content must not exceed ${CONTENT_MAX_WORDS} words`),
  urls: z.string().optional(),
  platforms: z.string().optional(),
  importUrl: z.string().optional(),
  isPrivate: z.boolean().optional().default(false),
  submitterNotes: z.string().optional(),
});

export type DocumentInput = z.infer<typeof documentSchema>;
