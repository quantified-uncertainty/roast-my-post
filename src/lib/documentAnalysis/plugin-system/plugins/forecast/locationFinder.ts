/**
 * Location finder for forecast-specific text patterns
 */

export interface ForecastLocation {
  startOffset: number;
  endOffset: number;
  quotedText: string;
}

/**
 * Find forecast text in document with fuzzy matching for predictions
 */
export function findForecastLocation(
  searchText: string,
  documentText: string,
  options: {
    allowPartialMatch?: boolean;
    normalizeQuotes?: boolean;
  } = {}
): ForecastLocation | null {
  // Try exact match first
  let pos = documentText.indexOf(searchText);
  if (pos !== -1) {
    return {
      startOffset: pos,
      endOffset: pos + searchText.length,
      quotedText: searchText
    };
  }

  // Normalize quotes if requested
  if (options.normalizeQuotes) {
    const normalizedSearch = normalizeQuotes(searchText);
    const normalizedDoc = normalizeQuotes(documentText);
    
    pos = normalizedDoc.indexOf(normalizedSearch);
    if (pos !== -1) {
      // Map back to original position
      const originalText = documentText.slice(pos, pos + searchText.length);
      return {
        startOffset: pos,
        endOffset: pos + searchText.length,
        quotedText: originalText
      };
    }
  }

  // Try partial match for long predictions
  if (options.allowPartialMatch && searchText.length > 50) {
    // Try to match first 50 characters
    const partialSearch = searchText.slice(0, 50);
    pos = documentText.indexOf(partialSearch);
    
    if (pos !== -1) {
      // Look for the end of the sentence or prediction
      let endPos = pos + partialSearch.length;
      
      // Find sentence end markers
      const sentenceEnders = ['. ', '.\n', '."', '."', '?', '!'];
      let foundEnd = false;
      
      for (let i = endPos; i < Math.min(documentText.length, endPos + 200); i++) {
        for (const ender of sentenceEnders) {
          if (documentText.slice(i, i + ender.length) === ender) {
            endPos = i + (ender.includes('.') ? 1 : ender.length);
            foundEnd = true;
            break;
          }
        }
        if (foundEnd) break;
      }
      
      return {
        startOffset: pos,
        endOffset: endPos,
        quotedText: documentText.slice(pos, endPos)
      };
    }
  }

  // Try to find key phrases from the prediction
  const keyPhrases = extractKeyPhrases(searchText);
  for (const phrase of keyPhrases) {
    if (phrase.length < 10) continue; // Skip short phrases
    
    pos = documentText.indexOf(phrase);
    if (pos !== -1) {
      // Expand to find the full prediction
      const expanded = expandToFullPrediction(documentText, pos, phrase.length);
      if (expanded) {
        return expanded;
      }
    }
  }

  return null;
}

/**
 * Normalize different quote styles
 */
function normalizeQuotes(text: string): string {
  return text
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'");
}

/**
 * Extract key phrases from a prediction for fuzzy matching
 */
function extractKeyPhrases(prediction: string): string[] {
  const phrases: string[] = [];
  
  // Look for year patterns
  const yearMatch = prediction.match(/\b20\d{2}\b/);
  if (yearMatch) {
    // Get text around the year
    const yearIndex = prediction.indexOf(yearMatch[0]);
    const start = Math.max(0, yearIndex - 20);
    const end = Math.min(prediction.length, yearIndex + yearMatch[0].length + 20);
    phrases.push(prediction.slice(start, end).trim());
  }
  
  // Look for percentage patterns
  const percentMatch = prediction.match(/\d+%/);
  if (percentMatch) {
    const percentIndex = prediction.indexOf(percentMatch[0]);
    const start = Math.max(0, percentIndex - 20);
    const end = Math.min(prediction.length, percentIndex + percentMatch[0].length + 20);
    phrases.push(prediction.slice(start, end).trim());
  }
  
  // Look for "will" statements
  if (prediction.includes(" will ")) {
    const willIndex = prediction.indexOf(" will ");
    const start = Math.max(0, willIndex - 10);
    const end = Math.min(prediction.length, willIndex + 40);
    phrases.push(prediction.slice(start, end).trim());
  }
  
  return phrases;
}

/**
 * Expand a partial match to find the full prediction
 */
function expandToFullPrediction(
  documentText: string,
  startPos: number,
  initialLength: number
): ForecastLocation | null {
  // Look backwards for sentence start
  let predictionStart = startPos;
  for (let i = startPos - 1; i >= Math.max(0, startPos - 200); i--) {
    if (documentText[i] === '.' || documentText[i] === '!' || documentText[i] === '?') {
      predictionStart = i + 1;
      // Skip whitespace
      while (predictionStart < startPos && /\s/.test(documentText[predictionStart])) {
        predictionStart++;
      }
      break;
    }
  }
  
  // Look forward for sentence end
  let predictionEnd = startPos + initialLength;
  for (let i = predictionEnd; i < Math.min(documentText.length, startPos + 300); i++) {
    if (documentText[i] === '.' || documentText[i] === '!' || documentText[i] === '?') {
      predictionEnd = i + 1;
      break;
    }
  }
  
  // Verify this looks like a prediction
  const extractedText = documentText.slice(predictionStart, predictionEnd);
  const predictionKeywords = ['will', 'shall', 'by 20', 'within', 'predict', 'forecast', 'expect'];
  
  const hasPredictionKeyword = predictionKeywords.some(keyword => 
    extractedText.toLowerCase().includes(keyword)
  );
  
  if (hasPredictionKeyword) {
    return {
      startOffset: predictionStart,
      endOffset: predictionEnd,
      quotedText: extractedText.trim()
    };
  }
  
  return null;
}