/**
 * Markdown utility functions for processing markdown content
 */

import { MAX_IMAGE_URL_LENGTH } from "@roast/domain";

// Shared regex for matching markdown images: ![alt](url) - allows whitespace between ] and (
const MARKDOWN_IMAGE_REGEX = /!\[([^\]]*)\]\s*\(([^)]+)\)/g;
// Shared regex for matching HTML images: <img ... src="..." ... />
const HTML_IMAGE_REGEX = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/g;
// Shared regex for matching markdown reference definitions: [id]: url
const MARKDOWN_REF_REGEX = /^\s*\[([^\]]+)\]:\s*([^\s]+)/gm;

/**
 * Checks if an image URL is considered "large"
 * Large images are:
 * - Base64 data URIs (data:image/...)
 * - URLs longer than the threshold
 */
function isLargeImage(url: string, urlLengthThreshold: number): boolean {
  let cleanUrl = url.trim();
  
  // Remove wrapping < > if present (CommonMark allows this)
  if (cleanUrl.startsWith('<') && cleanUrl.endsWith('>')) {
    cleanUrl = cleanUrl.slice(1, -1).trim();
  }

  const isBase64 = cleanUrl.toLowerCase().startsWith('data:image/');
  const isLongUrl = cleanUrl.length > urlLengthThreshold;
  return isBase64 || isLongUrl;
}

/**
 * Detects if markdown content contains large images
 * Large images are defined as:
 * - Base64 data URIs (data:image/...)
 * - URLs longer than the specified threshold (default: MAX_IMAGE_URL_LENGTH)
 * 
 * @param content - Markdown content to check
 * @param urlLengthThreshold - Minimum URL length to consider "large" (default: MAX_IMAGE_URL_LENGTH)
 * @returns True if large images are detected
 */
export function detectLargeImages(
  content: string,
  urlLengthThreshold: number = MAX_IMAGE_URL_LENGTH ?? 2000
): boolean {
  if (!content) return false;

  // Check Markdown images
  const mdRegex = new RegExp(MARKDOWN_IMAGE_REGEX.source, MARKDOWN_IMAGE_REGEX.flags);
  let match;
  while ((match = mdRegex.exec(content)) !== null) {
    const url = match[2];
    if (isLargeImage(url, urlLengthThreshold)) {
      return true;
    }
  }

  // Check HTML images
  const htmlRegex = new RegExp(HTML_IMAGE_REGEX.source, HTML_IMAGE_REGEX.flags);
  while ((match = htmlRegex.exec(content)) !== null) {
    const url = match[1];
    if (isLargeImage(url, urlLengthThreshold)) {
      return true;
    }
  }

  // Check Reference Definitions
  const refRegex = new RegExp(MARKDOWN_REF_REGEX.source, MARKDOWN_REF_REGEX.flags);
  while ((match = refRegex.exec(content)) !== null) {
    const url = match[2];
    if (isLargeImage(url, urlLengthThreshold)) {
      return true;
    }
  }

  return false;
}

/**
 * Strips large images from markdown content
 * Removes images with:
 * - Base64 data URIs (data:image/...)
 * - Very long URLs (default: >MAX_IMAGE_URL_LENGTH characters)
 * 
 * @param content - Markdown content
 * @param urlLengthThreshold - Minimum URL length to consider "large" (default: MAX_IMAGE_URL_LENGTH)
 * @returns Content with large images removed
 */
export function stripLargeImages(
  content: string,
  urlLengthThreshold: number = MAX_IMAGE_URL_LENGTH ?? 2000
): string {
  if (!content) return content;

  
  const matches: Array<{ match: string; index: number }> = [];
  let match;

  // Find Markdown images
  const mdRegex = new RegExp(MARKDOWN_IMAGE_REGEX.source, MARKDOWN_IMAGE_REGEX.flags);
  while ((match = mdRegex.exec(content)) !== null) {
    const url = match[2];
    if (isLargeImage(url, urlLengthThreshold)) {
      matches.push({
        match: match[0],
        index: match.index,
      });
    }
  }

  // Find HTML images
  const htmlRegex = new RegExp(HTML_IMAGE_REGEX.source, HTML_IMAGE_REGEX.flags);
  while ((match = htmlRegex.exec(content)) !== null) {
    const url = match[1];
    if (isLargeImage(url, urlLengthThreshold)) {
      matches.push({
        match: match[0],
        index: match.index,
      });
    }
  }

  // Find Reference Definitions
  const refRegex = new RegExp(MARKDOWN_REF_REGEX.source, MARKDOWN_REF_REGEX.flags);
  while ((match = refRegex.exec(content)) !== null) {
    const url = match[2];
    if (isLargeImage(url, urlLengthThreshold)) {
      matches.push({
        match: match[0],
        index: match.index,
      });
    }
  }

  // If no large images found, return original content
  if (matches.length === 0) {
    return content;
  }

  // Sort matches by index to process them correctly
  matches.sort((a, b) => a.index - b.index);

  // Replace large images by processing from end to start to preserve indices
  let result = content;
  for (let i = matches.length - 1; i >= 0; i--) {
    const { match: imageMatch, index } = matches[i];
    result = result.substring(0, index) + result.substring(index + imageMatch.length);
  }

  return result;
}
