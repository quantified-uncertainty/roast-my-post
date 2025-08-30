"use client";

import { useState, useEffect } from "react";
import { EvaluationsTab } from "@/components/AgentDetail/tabs";
import type { Agent } from "@roast/ai";

export default function AgentEvalsPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  // This needs to be converted to use server components with the agent data
  // For now, keeping it simple
  return <div>Evaluations page - needs implementation</div>;
}