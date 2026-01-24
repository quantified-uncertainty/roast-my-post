import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const modelId = request.nextUrl.searchParams.get("model");

  if (!modelId) {
    return NextResponse.json({ error: "model parameter required" }, { status: 400 });
  }

  try {
    // Don't encode the full modelId - OpenRouter expects the / as part of the path
    // e.g., /models/z-ai/glm-4.7/endpoints not /models/z-ai%2Fglm-4.7/endpoints
    const response = await fetch(
      `https://openrouter.ai/api/v1/models/${modelId}/endpoints`
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `OpenRouter API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch model endpoints:", error);
    return NextResponse.json(
      { error: "Failed to fetch model endpoints" },
      { status: 500 }
    );
  }
}
