"use client";

import { useParams } from 'next/navigation';
import AgentDetail from "@/components/AgentDetail";
import { evaluationAgents } from "@/data/agents";
import { notFound } from "next/navigation";

export default function AgentPage() {
  const params = useParams();
  const agentId = params.agentId as string;
  
  // Parse the agentId from the URL (format: id-version where version has - instead of . )
  // For example: "emotional-analyzer-2-4" for emotional-analyzer v2.4
  const agentIdParts = agentId.split("-");
  
  // Get the base id by removing the version part
  // For versions with multiple decimals (like 2.4.1), we need to handle accordingly
  let baseId: string;
  let versionParts: string[] = [];
  
  if (agentIdParts.length >= 2) {
    // The last one or two parts are likely the version
    // Try to determine if the last parts are numeric
    const potentialVersionParts = agentIdParts.slice(-2);
    
    if (!isNaN(Number(potentialVersionParts[0]))) {
      // We have at least one version part
      versionParts.push(potentialVersionParts[0]);
      baseId = agentIdParts.slice(0, -1).join("-");
      
      if (potentialVersionParts.length > 1 && !isNaN(Number(potentialVersionParts[1]))) {
        // We have a second version part
        versionParts.push(potentialVersionParts[1]);
        baseId = agentIdParts.slice(0, -2).join("-");
      }
    } else {
      // No version in the URL
      baseId = agentId;
    }
  } else {
    baseId = agentId;
  }
  
  // Reconstruct the version string with dots
  const versionString = versionParts.join(".");
  
  // Find the agent by base ID and version
  const agent = evaluationAgents.find(
    agent => agent.id === baseId && 
    (versionString ? agent.version === versionString : true)
  );
  
  if (!agent) {
    return notFound();
  }
  
  return <AgentDetail agent={agent} />;
}