import { logger } from "@/infrastructure/logging/logger";

interface ExportEvaluationData {
  evaluation: {
    id: string;
    evaluationId?: string;
    documentId: string;
    documentTitle: string;
    agentId: string;
    agentName: string;
    agentVersion?: string;
    evaluationVersion?: number | null;
    grade?: number | null;
    jobStatus?: string;
    createdAt: string | Date;
    summary?: string | null;
    analysis?: string | null;
    selfCritique?: string | null;
    comments?: Array<{
      id: string;
      description: string;
      importance?: number | null;
      grade?: number | null;
      header?: string | null;
      level?: string | null;
      source?: string | null;
      metadata?: Record<string, any> | null;
    }>;
    job?: {
      llmThinking?: string | null;
      priceInDollars?: number | string | null;
      tasks?: Array<{
        id: string;
        name: string;
        modelName: string;
        priceInDollars: number | null;
        timeInSeconds?: number | null;
        log?: string | null;
        createdAt: Date | string;
        llmInteractions?: any;
      }>;
    } | null;
    testBatchId?: string | null;
    testBatchName?: string | null;
  };
}

function escapeXml(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function exportEvaluationToXml(data: ExportEvaluationData): string {
  const { evaluation } = data;
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<evaluation>\n';
  
  // Meta information
  xml += '  <meta>\n';
  xml += `    <evaluationId>${evaluation.evaluationId || evaluation.id}</evaluationId>\n`;
  if (evaluation.evaluationVersion) {
    xml += `    <evaluationVersion>${evaluation.evaluationVersion}</evaluationVersion>\n`;
  }
  xml += `    <createdAt>${new Date(evaluation.createdAt).toISOString()}</createdAt>\n`;
  if (evaluation.jobStatus) {
    xml += `    <jobStatus>${evaluation.jobStatus}</jobStatus>\n`;
  }
  if (evaluation.testBatchId) {
    xml += '    <testBatch>\n';
    xml += `      <id>${evaluation.testBatchId}</id>\n`;
    if (evaluation.testBatchName) {
      xml += `      <name>${escapeXml(evaluation.testBatchName)}</name>\n`;
    }
    xml += '    </testBatch>\n';
  }
  xml += '  </meta>\n';
  
  // Document information
  xml += '  <document>\n';
  xml += `    <id>${evaluation.documentId}</id>\n`;
  xml += `    <title>${escapeXml(evaluation.documentTitle)}</title>\n`;
  xml += '  </document>\n';
  
  // Agent information
  xml += '  <agent>\n';
  xml += `    <id>${evaluation.agentId}</id>\n`;
  xml += `    <name>${escapeXml(evaluation.agentName)}</name>\n`;
  if (evaluation.agentVersion) {
    xml += `    <version>${escapeXml(evaluation.agentVersion)}</version>\n`;
  }
  xml += '  </agent>\n';
  
  // Results
  xml += '  <results>\n';
  if (evaluation.grade !== null && evaluation.grade !== undefined) {
    xml += `    <grade>${evaluation.grade}</grade>\n`;
  }
  if (evaluation.summary) {
    xml += `    <summary><![CDATA[${evaluation.summary}]]></summary>\n`;
  }
  if (evaluation.analysis) {
    xml += `    <analysis><![CDATA[${evaluation.analysis}]]></analysis>\n`;
  }
  if (evaluation.selfCritique) {
    xml += `    <selfCritique><![CDATA[${evaluation.selfCritique}]]></selfCritique>\n`;
  }
  xml += '  </results>\n';
  
  // Comments
  if (evaluation.comments && evaluation.comments.length > 0) {
    xml += '  <comments>\n';
    evaluation.comments.forEach(comment => {
      xml += '    <comment>\n';
      xml += `      <id>${comment.id}</id>\n`;
      xml += `      <description><![CDATA[${comment.description}]]></description>\n`;
      if (comment.header) {
        xml += `      <header><![CDATA[${comment.header}]]></header>\n`;
      }
      if (comment.level) {
        xml += `      <level>${comment.level}</level>\n`;
      }
      if (comment.source) {
        xml += `      <source>${comment.source}</source>\n`;
      }
      if (comment.importance !== null && comment.importance !== undefined) {
        xml += `      <importance>${comment.importance}</importance>\n`;
      }
      if (comment.grade !== null && comment.grade !== undefined) {
        xml += `      <grade>${comment.grade}</grade>\n`;
      }
      if (comment.metadata) {
        xml += `      <metadata><![CDATA[${JSON.stringify(comment.metadata, null, 2)}]]></metadata>\n`;
      }
      xml += '    </comment>\n';
    });
    xml += '  </comments>\n';
  }
  
  // Job execution details
  if (evaluation.job) {
    xml += '  <job>\n';
    if (evaluation.job.llmThinking) {
      xml += `    <thinking><![CDATA[${evaluation.job.llmThinking}]]></thinking>\n`;
    }
    if (evaluation.job.priceInDollars !== null && evaluation.job.priceInDollars !== undefined) {
      const price = typeof evaluation.job.priceInDollars === 'string' ? parseFloat(evaluation.job.priceInDollars) : evaluation.job.priceInDollars;
      xml += `    <priceInDollars>${price}</priceInDollars>\n`;
    }
    if (evaluation.job.tasks && evaluation.job.tasks.length > 0) {
      xml += '    <tasks>\n';
      evaluation.job.tasks.forEach(task => {
        xml += '      <task>\n';
        xml += `        <id>${task.id}</id>\n`;
        xml += `        <name>${escapeXml(task.name)}</name>\n`;
        xml += `        <model>${escapeXml(task.modelName)}</model>\n`;
        if (task.priceInDollars !== null && task.priceInDollars !== undefined) {
          xml += `        <costInDollars>${task.priceInDollars}</costInDollars>\n`;
        }
        if (task.timeInSeconds !== null && task.timeInSeconds !== undefined) {
          xml += `        <durationSeconds>${task.timeInSeconds}</durationSeconds>\n`;
        }
        if (task.log) {
          xml += `        <log><![CDATA[${task.log}]]></log>\n`;
        }
        xml += `        <createdAt>${new Date(task.createdAt).toISOString()}</createdAt>\n`;
        if (task.llmInteractions) {
          xml += `        <llmInteractions><![CDATA[${JSON.stringify(task.llmInteractions, null, 2)}]]></llmInteractions>\n`;
        }
        xml += '      </task>\n';
      });
      xml += '    </tasks>\n';
    }
    xml += '  </job>\n';
  }
  
  xml += '</evaluation>';
  
  return xml;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    logger.error('Failed to copy to clipboard:', error);
    return false;
  }
}