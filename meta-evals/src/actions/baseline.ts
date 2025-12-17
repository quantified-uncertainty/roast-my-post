/**
 * Create Baseline Run Action
 *
 * Creates evaluation batches for comparing agent performance.
 * - Select documents to evaluate
 * - Select agents to run
 * - Assigns a trackingId for later comparison
 */

import enquirer from "enquirer";
import Table from "cli-table3";
import { prisma } from "@roast/db";
import { apiClient, ApiError } from "../utils/apiClient";

const { prompt } = enquirer as any;

interface AgentChoice {
  id: string;
  name: string;
  version: number;
}

interface DocumentChoice {
  id: string;
  title: string;
  createdAt: Date;
}

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

export async function runBaselineAction() {
  console.log("\n📊 Create Baseline Run\n");

  // Step 0: Get current user from session
  const userId = await apiClient.getUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  console.log(`Acting as: ${user?.email || userId}\n`);

  // Step 1: Get available agents (owned by current user)
  const agents = await getAvailableAgents(userId);
  if (agents.length === 0) {
    console.log("No agents found that you own. Please create an agent first.");
    return;
  }

  // Step 2: Get available documents
  const documents = await getRecentDocuments();
  if (documents.length === 0) {
    console.log("No documents found. Please add documents first.");
    return;
  }

  // Step 3: Select documents
  const selectedDocs = await selectDocuments(documents);
  if (selectedDocs.length === 0) {
    console.log("No documents selected.");
    return;
  }

  // Step 4: Select agents
  const selectedAgents = await selectAgents(agents);
  if (selectedAgents.length === 0) {
    console.log("No agents selected.");
    return;
  }

  // Step 5: Enter tracking ID
  const trackingId = await promptTrackingId();

  // Step 6: Confirm
  const confirmed = await confirmRun(selectedDocs, selectedAgents, trackingId);
  if (!confirmed) {
    console.log("Cancelled.");
    return;
  }

  // Step 7: Create batches (one per agent)
  console.log("\n🚀 Creating evaluation batches...\n");

  const results: Array<{
    agent: string;
    trackingId: string;
    jobCount: number;
    status: "success" | "error";
    error?: string;
  }> = [];

  for (const agent of selectedAgents) {
    const agentTrackingId = `${trackingId}-${agent.id}`;

    try {
      const response = await apiClient.post<BatchCreateResponse>("/api/batches", {
        agentId: agent.id,
        documentIds: selectedDocs.map((d) => d.id),
        trackingId: agentTrackingId,
        name: `Baseline: ${trackingId}`,
      });

      results.push({
        agent: agent.name,
        trackingId: agentTrackingId,
        jobCount: response.batch.jobCount,
        status: "success",
      });

      console.log(`  ✓ ${agent.name}: ${response.batch.jobCount} jobs queued`);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : String(error);
      results.push({
        agent: agent.name,
        trackingId: agentTrackingId,
        jobCount: 0,
        status: "error",
        error: message,
      });
      console.log(`  ✗ ${agent.name}: ${message}`);
    }
  }

  // Step 8: Show summary
  printSummary(results, trackingId);
}

async function getAvailableAgents(userId: string): Promise<AgentChoice[]> {
  const agents = await prisma.agent.findMany({
    where: {
      // User-owned agents OR system-managed agents
      OR: [
        { submittedById: userId },
        { isSystemManaged: true },
      ],
      isDeprecated: false,
      ephemeralBatchId: null, // Exclude ephemeral agents
    },
    include: {
      versions: {
        orderBy: { version: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return agents
    .filter((a) => a.versions.length > 0)
    .map((a) => ({
      id: a.id,
      name: a.versions[0].name,
      version: a.versions[0].version,
    }));
}

async function getRecentDocuments(): Promise<DocumentChoice[]> {
  const documents = await prisma.document.findMany({
    where: {
      ephemeralBatchId: null, // Exclude ephemeral documents
    },
    include: {
      versions: {
        orderBy: { version: "desc" },
        take: 1,
        select: { title: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return documents
    .filter((d) => d.versions.length > 0)
    .map((d) => ({
      id: d.id,
      title: d.versions[0].title,
      createdAt: d.createdAt,
    }));
}

async function selectDocuments(
  documents: DocumentChoice[]
): Promise<DocumentChoice[]> {
  const { selectedIds } = await prompt({
    type: "multiselect",
    name: "selectedIds",
    message: "Select documents to evaluate:",
    choices: documents.map((d) => ({
      name: d.id,
      message: truncate(d.title, 60),
    })),
    validate: (value: string[]) => {
      if (value.length === 0) return "Select at least 1 document";
      if (value.length > 20) return "Maximum 20 documents";
      return true;
    },
  });

  return documents.filter((d) => selectedIds.includes(d.id));
}

async function selectAgents(agents: AgentChoice[]): Promise<AgentChoice[]> {
  const { selectedIds } = await prompt({
    type: "multiselect",
    name: "selectedIds",
    message: "Select agents to run:",
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

async function promptTrackingId(): Promise<string> {
  const defaultId = `baseline-${new Date().toISOString().slice(0, 10)}`;

  const { trackingId } = await prompt({
    type: "input",
    name: "trackingId",
    message: "Enter tracking ID for this run:",
    initial: defaultId,
    validate: (value: string) => {
      if (!value.trim()) return "Tracking ID is required";
      if (value.length > 50) return "Maximum 50 characters";
      if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
        return "Only letters, numbers, dashes, and underscores allowed";
      }
      return true;
    },
  });

  return trackingId;
}

async function confirmRun(
  documents: DocumentChoice[],
  agents: AgentChoice[],
  trackingId: string
): Promise<boolean> {
  console.log("\n📋 Summary:");
  console.log(`   Tracking ID: ${trackingId}`);
  console.log(`   Documents: ${documents.length}`);
  console.log(`   Agents: ${agents.length}`);
  console.log(`   Total jobs: ${documents.length * agents.length}`);

  const { confirmed } = await prompt({
    type: "confirm",
    name: "confirmed",
    message: "Create these evaluation batches?",
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
    error?: string;
  }>,
  baseTrackingId: string
) {
  console.log("\n");

  const table = new Table({
    head: ["Agent", "Tracking ID", "Jobs", "Status"],
    colWidths: [25, 35, 8, 10],
  });

  for (const r of results) {
    table.push([
      r.agent,
      r.trackingId,
      r.jobCount.toString(),
      r.status === "success" ? "✓" : "✗",
    ]);
  }

  console.log(table.toString());

  const successCount = results.filter((r) => r.status === "success").length;
  const totalJobs = results.reduce((sum, r) => sum + r.jobCount, 0);

  console.log(`\n✅ Created ${successCount}/${results.length} batches with ${totalJobs} total jobs`);
  console.log(`\nUse tracking ID prefix "${baseTrackingId}" to compare results later.`);
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}
