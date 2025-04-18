import json5 from "json5";
import { parse as parseJsonc, ParseError } from "jsonc-parser";

export function extractJsonContent(response: string): string {
  const jsonStart = response.indexOf("{");
  const jsonEnd = response.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1) {
    return response;
  }

  let jsonContent = response.substring(jsonStart, jsonEnd + 1);
  jsonContent = jsonContent
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  jsonContent = jsonContent.replace(/_([^_]+)_/g, "\\_$1\\_");
  jsonContent = jsonContent.replace(/^>/gm, "\\>");
  jsonContent = jsonContent.replace(/^\d+\./gm, (match) =>
    match.replace(".", "\\.")
  );
  jsonContent = jsonContent.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    "\\[$1\\]\\($2\\)"
  );
  jsonContent = jsonContent.replace(/(?<!\\)"/g, '\\"');
  jsonContent = jsonContent.replace(
    /[\u0000-\u001F\u007F-\u009F]/g,
    (match) => {
      return "\\u" + ("0000" + match.charCodeAt(0).toString(16)).slice(-4);
    }
  );

  return jsonContent;
}

export async function repairComplexJson(
  jsonString: string
): Promise<string | undefined> {
  try {
    const cleanedJson = extractJsonContent(jsonString);
    const errors: ParseError[] = [];
    const result = parseJsonc(cleanedJson, errors, {
      allowTrailingComma: true,
      disallowComments: false,
    });

    if (errors.length === 0) {
      return JSON.stringify(result);
    }

    console.warn("Initial jsonc-parser found issues:", errors);

    try {
      const parsed = json5.parse(cleanedJson);
      return JSON.stringify(parsed);
    } catch (error) {
      console.error("json5 parsing failed:", error);

      try {
        const jsonrepair = await import("jsonrepair");
        let cleaned = cleanedJson
          .replace(/\n/g, " ")
          .replace(/\r/g, "")
          .replace(/\t/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        const repaired = jsonrepair.jsonrepair(cleaned);
        JSON.parse(repaired);
        return repaired;
      } catch (repairError) {
        console.error("jsonrepair failed:", repairError);

        try {
          const jsonLoose = await import("json-loose");
          const parsed = jsonLoose.default(cleanedJson);
          return JSON.stringify(parsed);
        } catch (looseError) {
          console.error("json-loose failed:", looseError);
          return undefined;
        }
      }
    }
  } catch (error) {
    console.error("All repair attempts failed:", error);
    return undefined;
  }
}
