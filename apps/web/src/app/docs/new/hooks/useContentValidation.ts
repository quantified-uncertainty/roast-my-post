import { useMemo } from 'react';
import { CONTENT_MIN_CHARS, CONTENT_MAX_WORDS, CONTENT_MAX_CHARS } from '../schema';

export function useContentValidation(content: string | undefined) {
  return useMemo(() => {
    const charCount = content?.length || 0;
    const wordCount = content?.trim() ? content.trim().split(/\s+/).length : 0;
    
    const hasMinChars = charCount >= CONTENT_MIN_CHARS;
    const hasMaxChars = charCount <= CONTENT_MAX_CHARS;
    const hasMaxWords = wordCount <= CONTENT_MAX_WORDS;
    
    return {
      charCount,
      wordCount,
      hasMinChars,
      hasMaxChars,
      hasMaxWords,
    };
  }, [content]);
}