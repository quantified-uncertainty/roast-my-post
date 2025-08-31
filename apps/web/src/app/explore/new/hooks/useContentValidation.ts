import { useMemo } from 'react';
import { CONTENT_MIN_CHARS, CONTENT_MAX_WORDS } from '../schema';

export function useContentValidation(content: string | undefined) {
  return useMemo(() => {
    const charCount = content?.length || 0;
    const wordCount = content?.trim() ? content.trim().split(/\s+/).length : 0;
    
    const hasMinChars = charCount >= CONTENT_MIN_CHARS;
    const hasMaxWords = wordCount <= CONTENT_MAX_WORDS;
    
    return {
      charCount,
      wordCount,
      hasMinChars,
      hasMaxWords,
    };
  }, [content]);
}