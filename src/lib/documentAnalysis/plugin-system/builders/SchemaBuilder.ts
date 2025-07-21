/**
 * Simplified schema builder for consistent tool schemas
 */

// JSON Schema types
export interface JsonSchemaProperty {
  type: string;
  description?: string;
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  enum?: string[];
  [key: string]: unknown;
}

export interface JsonSchema {
  type: string;
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
  description?: string;
  [key: string]: unknown;
}

export class SchemaBuilder {
  /**
   * Build a standard extraction schema
   */
  static extraction(
    itemName: string,
    itemProperties: Record<string, JsonSchemaProperty>,
    additionalProperties?: Record<string, JsonSchemaProperty>
  ): JsonSchema {
    return {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description: `Unique identifier for this ${itemName}`
              },
              text: {
                type: "string",
                description: `The exact text containing the ${itemName}`
              },
              context: {
                type: "string",
                description: "Surrounding context for the finding"
              },
              location: {
                type: "object",
                properties: {
                  start: { type: "number", description: "Start position in the text" },
                  end: { type: "number", description: "End position in the text" }
                },
                description: "Character positions in the original text"
              },
              ...itemProperties
            },
            required: ["id", "text", "context", ...Object.keys(itemProperties)]
          }
        },
        ...additionalProperties
      },
      required: ["items", ...(additionalProperties ? Object.keys(additionalProperties) : [])]
    };
  }

  /**
   * Build a standard synthesis schema
   */
  static synthesis(
    includeVisualizations: boolean = false
  ): any {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "Overall summary of the analysis"
        },
        keyFindings: {
          type: "array",
          items: { type: "string" },
          description: "List of key findings or insights"
        },
        recommendations: {
          type: "array",
          items: { type: "string" },
          description: "Specific recommendations based on the analysis"
        },
        confidence: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "Confidence level in the analysis"
        },
        metrics: {
          type: "object",
          description: "Quantitative metrics from the analysis",
          additionalProperties: true
        }
      },
      required: ["summary", "keyFindings", "recommendations", "confidence"]
    };

    if (includeVisualizations) {
      schema.properties.visualizations = {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string", description: "Type of visualization" },
            data: { type: "object", description: "Visualization data" },
            title: { type: "string", description: "Visualization title" }
          },
          required: ["type", "data"]
        },
        description: "Data for creating visualizations"
      };
    }

    return schema;
  }

  /**
   * Build a custom schema
   */
  static custom(properties: Record<string, JsonSchemaProperty>, required?: string[]): JsonSchema {
    return {
      type: "object",
      properties,
      required: required || Object.keys(properties)
    };
  }

  /**
   * Common property definitions
   */
  static readonly properties = {
    text: (description: string = "Text content") => ({
      type: "string",
      description
    }),
    
    boolean: (description: string = "Boolean flag") => ({
      type: "boolean",
      description
    }),
    
    number: (description: string = "Numeric value") => ({
      type: "number",
      description
    }),
    
    enum: (values: string[], description: string = "One of the allowed values") => ({
      type: "string",
      enum: values,
      description
    }),
    
    array: (itemType: JsonSchemaProperty, description: string = "Array of items") => ({
      type: "array",
      items: itemType,
      description
    }),
    
    object: (properties: Record<string, any>, description: string = "Object with properties") => ({
      type: "object",
      properties,
      description
    })
  };
}