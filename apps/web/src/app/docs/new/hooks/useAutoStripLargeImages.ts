import { useEffect, useRef } from 'react';
import { UseFormSetValue } from 'react-hook-form';
import { detectLargeImages, stripLargeImages } from '@/shared/utils/markdown';

interface UseAutoStripLargeImagesOptions {
  content: string | undefined;
  hasMaxChars: boolean;
  setValue: UseFormSetValue<{ content: string }>;
}

/**
 * Automatically strips large images from content when it exceeds character limit
 */
export function useAutoStripLargeImages({
  content,
  hasMaxChars,
  setValue,
}: UseAutoStripLargeImagesOptions) {
  // Track if we've already auto-stripped to prevent loops
  const hasAutoStrippedRef = useRef(false);
  const lastContentLengthRef = useRef(0);

  useEffect(() => {
    if (!content) {
      // Reset when content is cleared
      hasAutoStrippedRef.current = false;
      lastContentLengthRef.current = 0;
      return;
    }
    
    // Only strip if content exceeds limit
    if (hasMaxChars) return;
    
    // Only process if content length changed significantly (likely a paste)
    // This prevents processing on every keystroke
    const lengthChanged = Math.abs(content.length - lastContentLengthRef.current) > 100;
    if (!lengthChanged && hasAutoStrippedRef.current) return;
    
    lastContentLengthRef.current = content.length;
    
    // Check if content contains large images (base64 or very long URLs)
    const hasLargeImages = detectLargeImages(content);
    
    if (hasLargeImages) {
      const strippedContent = stripLargeImages(content);
      
      // Only update if we actually removed something
      if (strippedContent.length < content.length) {
        setValue("content", strippedContent, { shouldValidate: true });
        hasAutoStrippedRef.current = true;
      }
    }
  }, [content, hasMaxChars, setValue]);
}

