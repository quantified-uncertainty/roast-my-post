/**
 * Create Baseline Action
 *
 * Creates the first run in a new evaluation series.
 * - Single document
 * - One or more agents
 * - Generates a series ID for grouping subsequent runs
 */

import enquirer from "enquirer";
import Table from "cli-table3";
import {
  metaEvaluationRepository,
  type AgentChoice,
  type DocumentChoice,
} from "@roast/db";
import { apiClient, ApiError } from "../utils/apiClient";

const { prompt } = enquirer as any;

interface BatchCreateResponse {
  batch: {
    id: string;
    trackingId: string;
    jobCount: number;
  };
  agent: {
    id: string;
  };
}

/**
 * Generate a short random ID for series identification
 */
function generateShortId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Generate timestamp string for run identification (YYYYMMDD-HHmm)
 */
function generateTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${year}${month}${day}-${hour}${min}`;
}

export async function createBaseline() {
  console.log("\n📊 Create New Baseline\n");

  // Step 1: Get current user
  const userId = await apiClient.getUserId();
  const user = await metaEvaluationRepository.getUserById(userId);
  console.log(`Acting as: ${user?.email || userId}\n`);

  // Step 2: Get available agents
  const agents = await metaEvaluationRepository.getAvailableAgents(userId);
  if (agents.length === 0) {
    console.log("No agents available. Please create an agent first.");
    return;
  }

  // Step 3: Get available documents
  const documents = await metaEvaluationRepository.getRecentDocuments();
  if (documents.length === 0) {
    console.log("No documents found. Please add documents first.");
    return;
  }

  // Step 4: Select ONE document
  console.log(`📄 Step 1/2: Select Document (${documents.length} available)\n`);
  const selectedDoc = await selectDocument(documents);
  if (!selectedDoc) {
    console.log("No document selected.");
    return;
  }

  // Step 5: Select agents (one or more)
  console.log(`\n🤖 Step 2/2: Select Agents (${agents.length} available)\n`);
  const selectedAgents = await selectAgents(agents);
  if (selectedAgents.length === 0) {
    console.log("No agents selected.");
    return;
  }

  // Step 6: Confirm
  const confirmed = await confirmBaseline(selectedDoc, selectedAgents);
  if (!confirmed) {
    console.log("Cancelled.");
    return;
  }

  // Step 7: Create series
  const seriesId = `series-${generateShortId()}`;
  const timestamp = generateTimestamp();

  console.log("\n🚀 Creating baseline evaluation...\n");

  const results: Array<{
    agent: string;
    trackingId: string;
    jobCount: number;
    status: "success" | "error";
    error?: string;
  }> = [];

  for (const agent of selectedAgents) {
    const trackingId = `${seriesId}-${timestamp}-${agent.id}`;

    try {
      const response = await apiClient.post<BatchCreateResponse>("/api/batches", {
        agentId: agent.id,
        documentIds: [selectedDoc.id],
        trackingId,
        name: `Baseline: ${selectedDoc.title.slice(0, 30)}`,
      });

      results.push({
        agent: agent.name,
        trackingId,
        jobCount: response.batch.jobCount,
        status: "success",
      });

      console.log(`  ✓ ${agent.name}: queued`);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : String(error);
      results.push({
        agent: agent.name,
        trackingId,
        jobCount: 0,
        status: "error",
        error: message,
      });
      console.log(`  ✗ ${agent.name}: ${message}`);
    }
  }

  // Step 8: Show summary
  printSummary(results, seriesId, selectedDoc.title);
}

/**
 * Create a new run in an existing series
 */
export async function createRun(
  seriesId: string,
  documentId: string,
  agentIds: string[]
) {
  const timestamp = generateTimestamp();

  console.log("\n🚀 Creating new run...\n");

  const results: Array<{
    agentId: string;
    trackingId: string;
    status: "success" | "error";
    error?: string;
  }> = [];

  for (const agentId of agentIds) {
    const trackingId = `${seriesId}-${timestamp}-${agentId}`;

    try {
      await apiClient.post<BatchCreateResponse>("/api/batches", {
        agentId,
        documentIds: [documentId],
        trackingId,
        name: `Run ${timestamp}`,
      });

      results.push({ agentId, trackingId, status: "success" });
      console.log(`  ✓ ${agentId}: queued`);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : String(error);
      results.push({ agentId, trackingId, status: "error", error: message });
      console.log(`  ✗ ${agentId}: ${message}`);
    }
  }

  const successCount = results.filter((r) => r.status === "success").length;
  console.log(`\n✅ Created ${successCount}/${results.length} jobs`);

  return results;
}

async function selectDocument(
  documents: DocumentChoice[]
): Promise<DocumentChoice | null> {
  // Display table of documents
  const table = new Table({
    head: ["#", "Title", "Created"],
    colWidths: [4, 50, 12],
  });

  documents.forEach((d, i) => {
    table.push([
      (i + 1).toString(),
      truncate(d.title, 48),
      formatDate(d.createdAt),
    ]);
  });

  console.log(table.toString());
  console.log("");

  const { selectedId } = await prompt({
    type: "select",
    name: "selectedId",
    message: "Select a document:",
    choices: documents.map((d, i) => ({
      name: d.id,
      message: `${i + 1}. ${truncate(d.title, 55)}`,
    })),
  });

  return documents.find((d) => d.id === selectedId) || null;
}

function formatDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}-${day}`;
}

async function selectAgents(agents: AgentChoice[]): Promise<AgentChoice[]> {
  const { selectedIds } = await prompt({
    type: "multiselect",
    name: "selectedIds",
    message: "Select agents to run (space to select, enter to confirm):",
    choices: agents.map((a) => ({
      name: a.id,
      message: `${a.name} (v${a.version})`,
    })),
    validate: (value: string[]) => {
      if (value.length === 0) return "Select at least 1 agent";
      return true;
    },
  });

  return agents.filter((a) => selectedIds.includes(a.id));
}

async function confirmBaseline(
  document: DocumentChoice,
  agents: AgentChoice[]
): Promise<boolean> {
  console.log("\n📋 Summary:");
  console.log(`   Document: ${truncate(document.title, 50)}`);
  console.log(`   Agents: ${agents.map((a) => a.name).join(", ")}`);

  const { confirmed } = await prompt({
    type: "confirm",
    name: "confirmed",
    message: "Create this baseline?",
    initial: true,
  });

  return confirmed;
}

function printSummary(
  results: Array<{
    agent: string;
    trackingId: string;
    jobCount: number;
    status: "success" | "error";
  }>,
  seriesId: string,
  docTitle: string
) {
  console.log("\n");

  const table = new Table({
    head: ["Agent", "Status"],
    colWidths: [40, 10],
  });

  for (const r of results) {
    table.push([r.agent, r.status === "success" ? "✓" : "✗"]);
  }

  console.log(table.toString());

  const successCount = results.filter((r) => r.status === "success").length;
  console.log(`\n✅ Baseline created: ${seriesId}`);
  console.log(`   Document: ${truncate(docTitle, 40)}`);
  console.log(`   Jobs queued: ${successCount}`);
  console.log(`\nSelect this series from the main menu to add more runs or compare.`);
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}
