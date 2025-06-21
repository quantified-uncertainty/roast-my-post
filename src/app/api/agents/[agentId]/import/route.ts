import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { AgentModel } from "@/models/Agent";
import { anthropic } from "@/types/openai";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { agentId } = resolvedParams;

    // Verify agent exists and user has access
    const agent = await AgentModel.getAgentWithOwner(agentId, session.user.id);
    if (!agent) {
      return Response.json({ error: "Agent not found" }, { status: 404 });
    }

    const { content } = await request.json();

    if (!content || typeof content !== 'string') {
      return Response.json({ 
        success: false,
        message: "Please provide content to import",
        changes: []
      });
    }

    // Use Claude to parse and convert the content
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `You are helping convert various formats of agent configuration data into a structured format for an AI agent evaluation system.

The user has pasted content that they want to import as an agent configuration. This could be:
- Markdown with YAML frontmatter (like from our export)
- JSON data
- Plain text instructions
- Any other format

Your job is to extract and structure this into the proper agent fields:

REQUIRED FIELDS:
- name (string): The agent's name
- description (string): What the agent does

OPTIONAL FIELDS:
- genericInstructions (string): General instructions for the agent
- summaryInstructions (string): Instructions for creating summaries
- commentInstructions (string): Instructions for creating comments
- gradeInstructions (string): Instructions for grading
- extendedCapabilityId (string): Special capability identifier

Use the parse_agent_content tool to extract and structure this data.

Here's the content to parse:

${content}`
        }
      ],
      tools: [
        {
          name: "parse_agent_content",
          description: "Parse and structure agent configuration data",
          input_schema: {
            type: "object",
            properties: {
              success: {
                type: "boolean",
                description: "Whether parsing was successful"
              },
              data: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Agent name" },
                  description: { type: "string", description: "Agent description" },
                  genericInstructions: { type: "string", description: "General instructions" },
                  summaryInstructions: { type: "string", description: "Summary instructions" },
                  commentInstructions: { type: "string", description: "Comment instructions" },
                  gradeInstructions: { type: "string", description: "Grade instructions" },
                  extendedCapabilityId: { type: "string", description: "Extended capability ID" }
                },
                required: ["name", "description"]
              },
              message: {
                type: "string",
                description: "Human-readable message about the parsing result"
              },
              changes: {
                type: "array",
                items: { type: "string" },
                description: "List of changes or assumptions made during parsing"
              }
            },
            required: ["success", "message", "changes"]
          }
        }
      ],
      tool_choice: { type: "tool", name: "parse_agent_content" }
    });

    const toolUse = response.content.find(
      (content: any) => content.type === "tool_use" && content.name === "parse_agent_content"
    );

    if (!toolUse || toolUse.type !== "tool_use") {
      return Response.json({
        success: false,
        message: "Failed to parse the provided content. Please check the format and try again.",
        changes: []
      });
    }

    return Response.json(toolUse.input);

  } catch (error) {
    console.error("Error processing import:", error);
    return Response.json({
      success: false,
      message: "An error occurred while processing your import. Please try again.",
      changes: []
    }, { status: 500 });
  }
}