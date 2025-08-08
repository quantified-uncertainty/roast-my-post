import type { ExtractedForecast } from "../../../tools/extract-forecasting-claims";

import type { ForecasterOutput } from "../../../tools/forecaster";
import { CommentSeverity, formatDiff, SEVERITY_STYLES } from "../../utils/comment-styles";

interface ForecastWithPrediction {
  forecast: ExtractedForecast;
  prediction?: ForecasterOutput;
}

// Rich detailed comments for document highlights
export function generateForecastComment(data: ForecastWithPrediction): string {
  const { forecast, prediction } = data;

  // If no prediction available, just note the forecast
  if (!prediction) {
    const style = SEVERITY_STYLES[CommentSeverity.INFO];
    const headerText = forecast.authorProbability ? `${forecast.authorProbability}%` : 'Prediction identified';
    return `🔮 [Forecast] <span style="color: ${style.color}">${headerText}</span>`;
  }

  // Calculate confidence gap
  const hasAuthorProb = forecast.authorProbability !== undefined;
  const gap = hasAuthorProb ? Math.abs(forecast.authorProbability! - prediction.probability) : 0;

  // Determine severity based on gap and robustness
  let severity: CommentSeverity;
  let emoji = '🎯';
  
  if (gap >= 40) {
    severity = CommentSeverity.HIGH;
    emoji = '⚠️';
  } else if (gap >= 25) {
    severity = CommentSeverity.MEDIUM;
  } else if (forecast.robustnessScore < 40) {
    severity = CommentSeverity.MEDIUM;
    emoji = '💡';
  } else {
    severity = CommentSeverity.LOW;
  }

  // Build compact header
  let headerContent = '';
  
  if (hasAuthorProb) {
    const diff = formatDiff(`${forecast.authorProbability}%`, `${prediction.probability}%`);
    headerContent = diff;
    
    // Add context for large gaps
    if (gap >= 40) {
      headerContent += ' (extreme overconfidence)';
    } else if (gap >= 25) {
      headerContent += ' (overconfident)';
    }
  } else {
    headerContent = `Our estimate: ${prediction.probability}%`;
  }
  
  // Add robustness warning if needed
  if (forecast.robustnessScore < 40) {
    headerContent += ' (weak empirical basis)';
  }

  const style = SEVERITY_STYLES[severity];
  const styledHeader = `${emoji} [Forecast] <span style="color: ${style.color}">${headerContent}</span>`;
  
  // Build content sections
  let content = styledHeader;
  
  // Add the forecast question/claim if available
  if (forecast.rewrittenPredictionText) {
    content += `\n\n**Forecast:** ${forecast.rewrittenPredictionText}`;
  }
  
  // Add explanation based on the type of issue
  let explanation = '';
  
  if (hasAuthorProb && gap >= 25) {
    // Overconfidence explanation
    explanation = `Our models suggest a more realistic probability of **${prediction.probability}%**. `;
    if (gap >= 40) {
      explanation += '_This level of certainty is extremely rare for future predictions._';
    }
    if (prediction.description) {
      explanation += `\n\n${prediction.description}`;
    } else {
      explanation += '\n\nHistorical base rates and implementation challenges suggest lower confidence.';
    }
  } else if (forecast.robustnessScore < 40) {
    // Weak empirical basis explanation
    explanation = '⚠️ **This prediction lacks strong empirical grounding.** ';
    if (forecast.robustnessScore < 20) {
      explanation += '_The claim appears extremely speculative with little supporting evidence._';
    } else {
      explanation += '_Limited historical precedent makes this forecast highly uncertain._';
    }
    if (prediction.description) {
      explanation += `\n\n${prediction.description}`;
    }
  } else if (prediction.description) {
    // General prediction reasoning
    explanation = prediction.description;
  }
  
  if (explanation) {
    content += `  \n${explanation}`;
  }
  
  // Add score table
  content += '\n\n';
  content += '| Metric | Score |\n';
  content += '|--------|-------|\n';
  content += `| Precision | ${forecast.precisionScore}/100 |\n`;
  content += `| Verifiability | ${forecast.verifiabilityScore}/100 |\n`;
  content += `| Importance | ${forecast.importanceScore}/100 |\n`;
  content += `| Robustness | ${forecast.robustnessScore}/100 |\n`;
  
  // Add author probability if available
  if (hasAuthorProb) {
    content += `| Author\'s Estimate | ${forecast.authorProbability}% |\n`;
  }
  
  // Add our prediction if available
  if (prediction) {
    content += `| Our Estimate | ${prediction.probability}% |\n`;
  }
  
  // Add resolution date if available
  if (forecast.resolutionDate) {
    content += `| Resolution Date | ${forecast.resolutionDate} |\n`;
  }
  
  // Add individual forecasts section if available
  if (prediction && prediction.individualForecasts && prediction.individualForecasts.length > 0) {
    content += '\n\n### Individual Forecasts\n\n';
    
    prediction.individualForecasts.forEach((forecast, index) => {
      content += `**Forecast ${index + 1}: \`${forecast.probability}%\`**  \n`;
      content += `${forecast.reasoning}\n\n`;
    });
    
    // Add statistics if available
    if (prediction.statistics) {
      content += `📊 **Statistics:** Mean \`${prediction.statistics.mean.toFixed(1)}%\`, Std Dev \`${prediction.statistics.stdDev.toFixed(1)}%\`\n`;
    }
    
    // Add consensus if available
    if (prediction.consensus) {
      const consensusEmoji = prediction.consensus === 'high' ? '🟢' : 
                            prediction.consensus === 'medium' ? '🟡' : '🔴';
      content += `${consensusEmoji} **Consensus:** _${prediction.consensus}_\n`;
    }
  }
  
  // Add Perplexity sources if available
  if (prediction && prediction.perplexityResults && prediction.perplexityResults.length > 0) {
    content += '\n\n### Sources\n\n';
    content += '| Source | Link |\n';
    content += '|--------|------|\n';
    prediction.perplexityResults.forEach(result => {
      // Escape any pipe characters in the title to avoid breaking the table
      const escapedTitle = result.title.replace(/\|/g, '\\|');
      content += `| ${escapedTitle} | [View](${result.url}) |\n`;
    });
  }
  
  return content;
}

// Helper functions
function formatConsensus(consensus: "low" | "medium" | "high"): string {
  const icons = { low: "🔴", medium: "🟡", high: "🟢" };
  return `${icons[consensus]} ${consensus.charAt(0).toUpperCase() + consensus.slice(1)}`;
}

function getRiskLevel(delta: number): { icon: string; level: string } {
  if (delta >= 80) return { icon: "🚨", level: "Maximum" };
  if (delta >= 60) return { icon: "⚠️⚠️⚠️⚠️", level: "Very High" };
  if (delta >= 40) return { icon: "⚠️⚠️⚠️", level: "High" };
  if (delta >= 25) return { icon: "⚠️⚠️", level: "Medium" };
  if (delta >= 10) return { icon: "⚠️", level: "Low" };
  return { icon: "✅", level: "Minimal" };
}

function generateConfidenceBar(value: number, max: number): string {
  const percentage = Math.min(value / max, 1);
  const filled = Math.round(percentage * 20);
  const empty = 20 - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

function getCalibrationGrade(avgGap: number): string {
  if (avgGap <= 5) return "A";
  if (avgGap <= 15) return "B";
  if (avgGap <= 30) return "C";
  if (avgGap <= 50) return "D";
  return "F";
}

function generateTopOverconfidentPredictions(forecasts: ForecastWithPrediction[]): string {
  const rankedForecasts = forecasts
    .filter(f => f.prediction && f.forecast.authorProbability !== undefined)
    .map(f => ({
      ...f,
      gap: Math.abs(f.forecast.authorProbability! - f.prediction!.probability)
    }))
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 3);

  if (rankedForecasts.length === 0) {
    return "## No Overconfident Predictions Found\n\nAll evaluated forecasts appear well-calibrated.";
  }

  let section = `## Top ${Math.min(3, rankedForecasts.length)} Most Overconfident Predictions\n\n`;

  rankedForecasts.forEach((fp, index) => {
    const f = fp.forecast;
    const p = fp.prediction!;
    const gap = fp.gap;
    
    section += `### ${index + 1}. "${f.originalText.slice(0, 50)}${f.originalText.length > 50 ? '...' : ''}"\n\n`;
    section += `**Reality check:** ~${p.probability}% | **Gap:** ${gap.toFixed(1)}%\n\n`;
    section += `\`\`\`\n`;
    section += `Author: ${generateConfidenceBar(f.authorProbability!, 100)} ${f.authorProbability}%\n`;
    section += `Model:  ${generateConfidenceBar(p.probability, 100)} ${p.probability}%\n`;
    section += `\`\`\`\n\n`;
    
    section += `<details>\n<summary>🔍 Full Analysis</summary>\n\n`;
    section += `**Original text:**\n\n> "${f.originalText}"\n\n`;
    section += `**Extracted forecast:**  \n_${f.rewrittenPredictionText}_\n\n`;
    section += `**Quality scores:** Precision: \`${f.precisionScore}\` | Verifiable: \`${f.verifiabilityScore}\` | Important: \`${f.importanceScore}\` | Robustness: \`${f.robustnessScore}\`\n\n`;
    section += `**Our reasoning:**  \n${p.description}\n\n`;
    
    if (p.individualForecasts && p.individualForecasts.length > 0) {
      section += `**Individual model forecasts:**\n\n`;
      p.individualForecasts.forEach((individual: any, i: number) => {
        section += `- **Model ${i + 1}:** ${individual.probability}% - "${individual.reasoning}"\n`;
      });
      section += `\n`;
    }
    
    section += `**Consensus:** ${formatConsensus(p.consensus)}\n\n`;
    section += `</details>\n\n`;
  });

  return section;
}

function _getRobustnessAdjective(score: number): string {
  if (score < 20) return "extremely weak";
  if (score < 40) return "questionable";
  if (score < 60) return "uncertain";
  if (score < 80) return "moderately robust";
  return "robust";
}

function _getRobustnessExplanation(score: number): string {
  if (score < 20) {
    return "Almost certainly overstated. Lacks precedent or violates known constraints.";
  }
  if (score < 40) {
    return "Significant empirical doubts. Historical base rates suggest overconfidence.";
  }
  if (score < 60) {
    return "Some supporting evidence but key uncertainties remain unaddressed.";
  }
  return "Generally plausible but consider potential biases.";
}

function _identifySpecificationIssues(forecast: ExtractedForecast): string[] {
  const issues: string[] = [];
  const text = forecast.originalText.toLowerCase();

  // Check for vague quantifiers
  const vagueTerms = [
    "significantly",
    "substantially",
    "major",
    "considerable",
    "massive",
  ];
  vagueTerms.forEach((term) => {
    if (text.includes(term)) {
      issues.push(`"${term}" - No quantitative threshold provided`);
    }
  });

  // Check for missing timeline
  if (
    !forecast.resolutionDate &&
    !text.match(
      /\d{4}|january|february|march|april|may|june|july|august|september|october|november|december/i
    )
  ) {
    issues.push("No timeline - Resolution date unclear");
  }

  // Check for undefined scope
  if (
    text.includes("enterprise") ||
    text.includes("companies") ||
    text.includes("organizations")
  ) {
    if (!text.match(/fortune \d+|s&p \d+|top \d+/i)) {
      issues.push("Vague scope - Which companies specifically?");
    }
  }

  // Check precision score reasons
  if (forecast.precisionScore < 50) {
    issues.push("Heavy interpretation required to create testable prediction");
  }

  return issues;
}

// Document-level summary generator
export function generateDocumentSummary(
  forecasts: ForecastWithPrediction[]
): string {
  const total = forecasts.length;
  const withPredictions = forecasts.filter((f) => f.prediction).length;
  
  // Calculate overconfidence metrics
  const overconfidenceGaps = forecasts
    .filter(f => f.prediction && f.forecast.authorProbability !== undefined)
    .map(f => Math.abs(f.forecast.authorProbability! - f.prediction!.probability));
  
  const avgGap = overconfidenceGaps.length > 0 ? 
    overconfidenceGaps.reduce((sum, gap) => sum + gap, 0) / overconfidenceGaps.length : 0;
  
  const avgAuthorConfidence = forecasts
    .filter(f => f.forecast.authorProbability !== undefined)
    .reduce((sum, f) => sum + f.forecast.authorProbability!, 0) / 
    forecasts.filter(f => f.forecast.authorProbability !== undefined).length || 0;
    
  const avgOurEstimate = forecasts
    .filter(f => f.prediction)
    .reduce((sum, f) => sum + f.prediction!.probability, 0) / withPredictions || 0;

  const avgRobustness = Math.round(
    forecasts.reduce((sum, f) => sum + f.forecast.robustnessScore, 0) / total
  );
  
  // Determine risk level based on average gap
  const riskLevel = getRiskLevel(avgGap);
  const riskIcons = "⚠️".repeat(Math.min(5, Math.ceil(avgGap / 20)));

  // Build executive summary like the analysis example
  let summary = `# 🚨 Forecast Analysis: ${avgGap > 50 ? 'Extreme Overconfidence Detected' : 'Analysis Summary'}

## Executive Summary

**${avgGap > 50 ? 'Critical Finding:' : 'Summary:'} ${total} ${total === 1 ? 'prediction' : 'technology predictions'} with average ${avgGap.toFixed(1)}% ${avgGap > 10 ? 'overconfidence' : 'confidence'} gap**

- **Author average:** ${avgAuthorConfidence.toFixed(0)}% confidence
- **Our estimates:** ${avgOurEstimate.toFixed(1)}% average
- **Risk level:** ${riskIcons} ${riskLevel.level}

<details>
<summary>📊 Quick Stats</summary>

- **Total forecasts analyzed:** ${total}
- **Forecasts we could evaluate:** ${withPredictions}
- **Average precision score:** ${Math.round(forecasts.reduce((sum, f) => sum + f.forecast.precisionScore, 0) / total)}/100
- **Average verifiability score:** ${Math.round(forecasts.reduce((sum, f) => sum + f.forecast.verifiabilityScore, 0) / total)}/100
- **Average importance score:** ${Math.round(forecasts.reduce((sum, f) => sum + f.forecast.importanceScore, 0) / total)}/100
- **Average robustness score:** ${avgRobustness}/100 ${avgRobustness < 40 ? '🚨' : ''}
${overconfidenceGaps.length > 0 ? `- **Largest confidence gap:** ${Math.max(...overconfidenceGaps).toFixed(1)}%
- **Smallest confidence gap:** ${Math.min(...overconfidenceGaps).toFixed(1)}%` : ''}

</details>

---

${generateTopOverconfidentPredictions(forecasts)}

---

## Forecaster Calibration Report Card

**Overall Grade: ${getCalibrationGrade(avgGap)}**

📊 **Calibration Score: ${Math.max(0, Math.round(100 - avgGap * 1.2))}/100**

<details>
<summary>📋 Detailed Scoring</summary>

**What we measured:**

- ${forecasts.every(f => f.forecast.originalText) ? '✅' : '❌'} **Specific Predictions:** ${forecasts.filter(f => f.forecast.originalText).length}/${total} - ${forecasts.every(f => f.forecast.originalText) ? 'All forecasts have clear, binary outcomes' : 'Some forecasts lack clear outcomes'}
- ${forecasts.every(f => f.forecast.verifiabilityScore >= 60) ? '✅' : '❌'} **Measurable Outcomes:** ${forecasts.filter(f => f.forecast.verifiabilityScore >= 60).length}/${total} - ${forecasts.every(f => f.forecast.verifiabilityScore >= 60) ? 'All can be verified when resolved' : 'Some lack clear resolution criteria'}
- ${forecasts.every(f => f.forecast.authorProbability !== undefined) ? '✅' : '❌'} **Explicit Probabilities:** ${forecasts.filter(f => f.forecast.authorProbability !== undefined).length}/${total} - ${forecasts.every(f => f.forecast.authorProbability !== undefined) ? 'All include percentage estimates' : 'Some lack explicit probabilities'}
- ${forecasts.every(f => f.forecast.resolutionDate) ? '✅' : '❌'} **Resolution Dates:** ${forecasts.filter(f => f.forecast.resolutionDate).length}/${total} - ${forecasts.every(f => f.forecast.resolutionDate) ? 'All have specific deadlines' : 'Some lack clear timelines'}
- ${avgRobustness >= 40 ? '✅' : '❌'} **Robustness:** Average ${avgRobustness}/100 - ${avgRobustness >= 40 ? 'Claims have reasonable empirical grounding' : 'Claims lack empirical grounding'}
- ${avgGap <= 10 ? '✅' : '❌'} **Calibration:** ${avgGap <= 10 ? 'Well-calibrated predictions' : `All forecasts show >${avgGap.toFixed(0)}% ${avgGap > 0 ? 'overconfidence' : 'underconfidence'}`}

**Score breakdown:**

- Positives: ${forecasts.every(f => f.forecast.originalText && f.forecast.authorProbability !== undefined && f.forecast.resolutionDate) ? 'Clear, specific, measurable predictions (+12 points)' : 'Partial prediction quality (+6 points)'}
- Negatives: ${avgGap > 50 ? `Extreme overconfidence across all predictions (-${Math.round(avgGap * 1.2)} points)` : avgGap > 10 ? `Significant overconfidence (-${Math.round(avgGap)} points)` : 'Minor calibration issues'}

</details>

---`;

  // Add remaining sections similar to analysis example
  summary += generateAllForecastsRanked(forecasts);
  summary += generateQualityScoreDistribution(forecasts);
  summary += generateConsensusAnalysis(forecasts);
  summary += generateRawForecastData(forecasts);

  return summary;
}

function _generateBar(value: number, total: number): string {
  const percentage = value / total;
  const filled = Math.round(percentage * 12);
  return "█".repeat(filled) + "░".repeat(12 - filled);
}

function _generateSystematicIssues(forecasts: ForecastWithPrediction[]): string {
  const issues: string[] = [];

  const missingProbs = forecasts.filter(
    (f) => !f.forecast.authorProbability
  ).length;
  if (missingProbs > 0) {
    issues.push(
      `- 🔴 **Missing probabilities**: ${Math.round((missingProbs / forecasts.length) * 100)}% of forecasts lack explicit percentages`
    );
  }

  const avgPrecision =
    forecasts.reduce((sum, f) => sum + f.forecast.precisionScore, 0) /
    forecasts.length;
  if (avgPrecision < 70) {
    issues.push(
      `- 🟡 **Low precision**: Average precision ${Math.round(avgPrecision)}% (target: 70%+)`
    );
  }

  const withDates = forecasts.filter((f) => f.forecast.resolutionDate).length;
  if (withDates === forecasts.length) {
    issues.push(
      `- 🟢 **Clear timelines**: 100% include specific resolution dates`
    );
  }

  return issues.join("\n");
}

function generateAllForecastsRanked(forecasts: ForecastWithPrediction[]): string {
  const rankedForecasts = forecasts
    .filter(f => f.prediction && f.forecast.authorProbability !== undefined)
    .map(f => ({
      ...f,
      gap: Math.abs(f.forecast.authorProbability! - f.prediction!.probability)
    }))
    .sort((a, b) => b.gap - a.gap);

  if (rankedForecasts.length === 0) {
    return "\n## All Forecasts\n\nNo forecasts available for ranking.\n\n---\n\n";
  }

  let section = `## All Forecasts Ranked by Confidence Gap

<details>
<summary>📊 View All ${forecasts.length} Forecasts</summary>

| Rank | Forecast                               | Author | Our Est. | Gap   | Robustness |
| ---- | -------------------------------------- | ------ | -------- | ----- | ---------- |
`;

  rankedForecasts.forEach((fp, index) => {
    const f = fp.forecast;
    const p = fp.prediction!;
    const gap = fp.gap;
    const shortForecast = f.originalText.slice(0, 38) + (f.originalText.length > 38 ? "..." : "");
    
    section += `| ${index + 1}    | ${shortForecast} | ${f.authorProbability}%    | ${p.probability}%     | ${gap.toFixed(1)}% | ${f.robustnessScore}/100     |\n`;
  });

  // Add unranked forecasts (those without predictions)
  const unrankedForecasts = forecasts.filter(f => !f.prediction || f.forecast.authorProbability === undefined);
  unrankedForecasts.forEach((fp, index) => {
    const f = fp.forecast;
    const shortForecast = f.originalText.slice(0, 38) + (f.originalText.length > 38 ? "..." : "");
    const rankIndex = rankedForecasts.length + index + 1;
    
    section += `| ${rankIndex}    | ${shortForecast} | ${f.authorProbability || 'N/A'}    | N/A      | N/A   | ${f.robustnessScore}/100     |\n`;
  });

  section += `\n**Resolution timeline:**\n\n`;
  const resolutionDates = forecasts
    .filter(f => f.forecast.resolutionDate)
    .reduce((acc, f) => {
      const year = f.forecast.resolutionDate!.slice(0, 4);
      acc[year] = (acc[year] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  Object.entries(resolutionDates)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([year, count]) => {
      section += `- **${year}:** ${count} forecast${count > 1 ? 's' : ''} (Dec 31)\n`;
    });

  section += `\n</details>\n\n---\n\n`;
  return section;
}

function generateQualityScoreDistribution(forecasts: ForecastWithPrediction[]): string {
  const total = forecasts.length;
  
  // Calculate distributions for each score type
  const precisionDistribution = {
    high: forecasts.filter(f => f.forecast.precisionScore >= 80).length,
    medium: forecasts.filter(f => f.forecast.precisionScore >= 60 && f.forecast.precisionScore < 80).length,
    low: forecasts.filter(f => f.forecast.precisionScore < 60).length
  };
  
  const verifiabilityDistribution = {
    high: forecasts.filter(f => f.forecast.verifiabilityScore >= 80).length,
    medium: forecasts.filter(f => f.forecast.verifiabilityScore >= 60 && f.forecast.verifiabilityScore < 80).length,
    low: forecasts.filter(f => f.forecast.verifiabilityScore < 60).length
  };
  
  const robustnessDistribution = {
    high: forecasts.filter(f => f.forecast.robustnessScore >= 40).length,
    medium: forecasts.filter(f => f.forecast.robustnessScore >= 20 && f.forecast.robustnessScore < 40).length,
    low: forecasts.filter(f => f.forecast.robustnessScore < 20).length
  };

  return `## Quality Score Distribution

<details>
<summary>📈 Score Breakdowns</summary>

### Precision Scores

\`\`\`
80-100: ${generateDistributionBar(precisionDistribution.high, total)} ${precisionDistribution.high} forecasts (${Math.round(precisionDistribution.high / total * 100)}%)
60-79:  ${generateDistributionBar(precisionDistribution.medium, total)} ${precisionDistribution.medium} forecasts (${Math.round(precisionDistribution.medium / total * 100)}%)
<60:    ${generateDistributionBar(precisionDistribution.low, total)} ${precisionDistribution.low} forecasts (${Math.round(precisionDistribution.low / total * 100)}%)
\`\`\`

### Verifiability Scores

\`\`\`
80-100: ${generateDistributionBar(verifiabilityDistribution.high, total)} ${verifiabilityDistribution.high} forecasts (${Math.round(verifiabilityDistribution.high / total * 100)}%)
60-79:  ${generateDistributionBar(verifiabilityDistribution.medium, total)} ${verifiabilityDistribution.medium} forecasts (${Math.round(verifiabilityDistribution.medium / total * 100)}%)
<60:    ${generateDistributionBar(verifiabilityDistribution.low, total)} ${verifiabilityDistribution.low} forecasts (${Math.round(verifiabilityDistribution.low / total * 100)}%)
\`\`\`

### Robustness Scores ${forecasts.every(f => f.forecast.robustnessScore < 40) ? '(🚨 Problem Area)' : ''}

\`\`\`
40+:    ${generateDistributionBar(robustnessDistribution.high, total)} ${robustnessDistribution.high} forecasts (${Math.round(robustnessDistribution.high / total * 100)}%)
20-39:  ${generateDistributionBar(robustnessDistribution.medium, total)} ${robustnessDistribution.medium} forecasts (${Math.round(robustnessDistribution.medium / total * 100)}%)
<20:    ${generateDistributionBar(robustnessDistribution.low, total)} ${robustnessDistribution.low} forecasts (${Math.round(robustnessDistribution.low / total * 100)}%)
\`\`\`

**Key insight:** ${robustnessDistribution.high === 0 ? 'Extremely low robustness across all forecasts.' : robustnessDistribution.high < total / 2 ? 'Low robustness is a major concern.' : 'Reasonable quality across most metrics.'}

</details>

---

`;
}

function generateConsensusAnalysis(forecasts: ForecastWithPrediction[]): string {
  const evaluatedForecasts = forecasts.filter(f => f.prediction);
  
  if (evaluatedForecasts.length === 0) {
    return `## Consensus Analysis

No forecasts were evaluated for consensus analysis.

---

`;
  }

  const consensusLevels = {
    high: evaluatedForecasts.filter(f => f.prediction!.consensus === 'high').length,
    medium: evaluatedForecasts.filter(f => f.prediction!.consensus === 'medium').length,
    low: evaluatedForecasts.filter(f => f.prediction!.consensus === 'low').length
  };

  return `## Consensus Analysis

<details>
<summary>🤝 Model Agreement Levels</summary>

For the ${evaluatedForecasts.length} forecasts we evaluated:

**High Consensus (Models strongly agree):**

${evaluatedForecasts
  .filter(f => f.prediction!.consensus === 'high')
  .map(f => `- ✅ ${f.forecast.originalText.slice(0, 40)}${f.forecast.originalText.length > 40 ? '...' : ''}: ${f.prediction!.probability}%`)
  .join('\n') || '- None'}

**Medium Consensus (Some disagreement):**

${evaluatedForecasts
  .filter(f => f.prediction!.consensus === 'medium')
  .map(f => `- 🟡 ${f.forecast.originalText.slice(0, 40)}${f.forecast.originalText.length > 40 ? '...' : ''}: ${f.prediction!.probability}%`)
  .join('\n') || '- None'}

**Low Consensus (Significant disagreement):**

${evaluatedForecasts
  .filter(f => f.prediction!.consensus === 'low')
  .map(f => `- 🔴 ${f.forecast.originalText.slice(0, 40)}${f.forecast.originalText.length > 40 ? '...' : ''}: ${f.prediction!.probability}%`)
  .join('\n') || '- None'}

**Statistics summary:**

- High consensus: ${consensusLevels.high}/${evaluatedForecasts.length} forecasts (${Math.round(consensusLevels.high / evaluatedForecasts.length * 100)}%)
- Medium consensus: ${consensusLevels.medium}/${evaluatedForecasts.length} forecasts (${Math.round(consensusLevels.medium / evaluatedForecasts.length * 100)}%)
- Low consensus: ${consensusLevels.low}/${evaluatedForecasts.length} forecasts (${Math.round(consensusLevels.low / evaluatedForecasts.length * 100)}%)

</details>

---

`;
}

function generateRawForecastData(forecasts: ForecastWithPrediction[]): string {
  const avgAuthorConfidence = forecasts
    .filter(f => f.forecast.authorProbability !== undefined)
    .reduce((sum, f) => sum + f.forecast.authorProbability!, 0) / 
    forecasts.filter(f => f.forecast.authorProbability !== undefined).length || 0;
    
  const avgOurEstimate = forecasts
    .filter(f => f.prediction)
    .reduce((sum, f) => sum + f.prediction!.probability, 0) / 
    forecasts.filter(f => f.prediction).length || 0;
    
  const avgGap = forecasts
    .filter(f => f.prediction && f.forecast.authorProbability !== undefined)
    .reduce((sum, f) => sum + Math.abs(f.forecast.authorProbability! - f.prediction!.probability), 0) /
    forecasts.filter(f => f.prediction && f.forecast.authorProbability !== undefined).length || 0;

  return `<details>
<summary>📊 View Raw Forecast Data (JSON)</summary>

\`\`\`json
{
  "summary": {
    "total_forecasts": ${forecasts.length},
    "evaluated": ${forecasts.filter(f => f.prediction).length},
    "avg_author_confidence": ${avgAuthorConfidence.toFixed(1)},
    "avg_our_estimates": ${avgOurEstimate.toFixed(1)},
    "avg_gap": ${avgGap.toFixed(1)},
    "avg_precision": ${Math.round(forecasts.reduce((sum, f) => sum + f.forecast.precisionScore, 0) / forecasts.length)},
    "avg_verifiability": ${Math.round(forecasts.reduce((sum, f) => sum + f.forecast.verifiabilityScore, 0) / forecasts.length)},
    "avg_importance": ${Math.round(forecasts.reduce((sum, f) => sum + f.forecast.importanceScore, 0) / forecasts.length)},
    "avg_robustness": ${Math.round(forecasts.reduce((sum, f) => sum + f.forecast.robustnessScore, 0) / forecasts.length)}
  },
  "forecasts": [
${forecasts.map((fp, _index) => `    {
      "original": "${fp.forecast.originalText.replace(/"/g, '\\"')}",
      "rewritten": "${fp.forecast.rewrittenPredictionText.replace(/"/g, '\\"')}",
      "author_prob": ${fp.forecast.authorProbability || 'null'},
      "our_estimate": ${fp.prediction?.probability || 'null'},${fp.prediction && fp.forecast.authorProbability !== undefined ? `
      "gap": ${Math.abs(fp.forecast.authorProbability - fp.prediction.probability).toFixed(1)},` : ''}
      "precision": ${fp.forecast.precisionScore},
      "verifiability": ${fp.forecast.verifiabilityScore},
      "importance": ${fp.forecast.importanceScore},
      "robustness": ${fp.forecast.robustnessScore},
      "resolution_date": "${fp.forecast.resolutionDate || 'null'}"${fp.prediction ? `,
      "consensus": "${fp.prediction.consensus}"` : ''}
    }`).join(',\n')}
  ]
}
\`\`\`

</details>
`;
}

function generateDistributionBar(value: number, total: number): string {
  const percentage = value / total;
  const filled = Math.round(percentage * 20);
  const empty = 20 - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

function _generateRecommendations(forecasts: ForecastWithPrediction[]): string {
  const recs: string[] = [];

  const hasRanges = forecasts.some(
    (f) =>
      f.forecast.originalText.includes("-") &&
      f.forecast.originalText.match(/\d+-\d+/)
  );
  if (hasRanges) {
    recs.push(
      '1. **Replace ranges** with "at least X%" for clearer resolution'
    );
  }

  const missingProbs = forecasts.some((f) => !f.forecast.authorProbability);
  if (missingProbs) {
    recs.push(
      '2. **Add explicit probabilities** even for "likely" statements (suggest 70%)'
    );
  }

  const hasVagueTerms = forecasts.some((f) => f.forecast.precisionScore < 60);
  if (hasVagueTerms) {
    recs.push(
      '3. **Define ambiguous terms** upfront (e.g., "major cities" = top 10 metros)'
    );
  }

  return recs.join("\n");
}

// Export the ForecastWithPrediction type for use in other files
export type { ForecastWithPrediction };
