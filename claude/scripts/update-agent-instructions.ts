#!/usr/bin/env npx tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateAgentInstructions() {
  console.log('🔧 Adding missing instructions to agents...\n');

  // 1. Update Eliezer Simulator
  const eliezer = await prisma.agent.findUnique({
    where: { id: 'IQYnCfrwvu5-RDkO' },
    include: { versions: { orderBy: { version: 'desc' }, take: 1 } }
  });

  if (eliezer) {
    const latestVersion = eliezer.versions[0];
    console.log(`Updating Eliezer Simulator (current version: ${latestVersion.version})`);
    
    await prisma.agentVersion.create({
      data: {
        agentId: eliezer.id,
        version: latestVersion.version + 1,
        name: latestVersion.name,
        agentType: latestVersion.agentType,
        description: latestVersion.description,
        genericInstructions: latestVersion.genericInstructions,
        summaryInstructions: latestVersion.summaryInstructions,
        commentInstructions: latestVersion.commentInstructions,
        gradeInstructions: latestVersion.gradeInstructions,
        analysisInstructions: `<analysis_structure>
Provide a comprehensive analysis in the style of Eliezer Yudkowsky, focusing on:

1. **Rationality Assessment**: Evaluate the reasoning patterns, biases, and epistemic practices displayed
2. **Conceptual Clarity**: Identify confused concepts, category errors, and opportunities for disambiguation  
3. **Alignment & Safety Implications**: Consider any AI safety or existential risk angles
4. **Decision Theory**: Analyze decision-making frameworks and game-theoretic considerations
5. **Overall Coherence**: Assess logical consistency and strength of arguments

Use Eliezer's characteristic precise language, references to LessWrong concepts, and focus on getting the fundamentals right. Be direct about flaws while maintaining intellectual respect.
</analysis_structure>`,
        selfCritiqueInstructions: `<self_critique>
Score your evaluation 1-100 based on:

- **Rationalist Rigor** (30%): Did you apply proper rationalist thinking? Check for your own biases.
- **Conceptual Precision** (25%): Were your critiques precise and well-defined? Avoid vague criticism.
- **Yudkowsky Authenticity** (20%): Does this sound like something Eliezer would actually write?
- **Constructiveness** (15%): Did you provide actionable insights, not just clever putdowns?
- **Evidence Quality** (10%): Did you cite specific examples from the text?

Be especially critical if you:
- Used rationalist jargon without substance
- Made overconfident claims without proper justification
- Failed to steelman the author's position
- Let personal biases influence the assessment
</self_critique>`,
        extendedCapabilityId: latestVersion.extendedCapabilityId
      }
    });
    console.log('✅ Eliezer Simulator updated\n');
  }

  // 2. Update Link Verifier
  const linkVerifier = await prisma.agent.findUnique({
    where: { id: 'MUpu1JN0oSJFxz6_' },
    include: { versions: { orderBy: { version: 'desc' }, take: 1 } }
  });

  if (linkVerifier) {
    const latestVersion = linkVerifier.versions[0];
    console.log(`Updating Link Verifier (current version: ${latestVersion.version})`);
    
    await prisma.agentVersion.create({
      data: {
        agentId: linkVerifier.id,
        version: latestVersion.version + 1,
        name: latestVersion.name,
        agentType: latestVersion.agentType,
        description: latestVersion.description,
        genericInstructions: latestVersion.genericInstructions,
        summaryInstructions: latestVersion.summaryInstructions,
        commentInstructions: latestVersion.commentInstructions,
        gradeInstructions: latestVersion.gradeInstructions,
        analysisInstructions: `<analysis_structure>
Provide a comprehensive link verification analysis:

1. **Link Status Summary**: Overview of all links checked (working, broken, redirected)
2. **Critical Issues**: Broken links or significant problems that need immediate attention
3. **Content Verification**: Whether linked content matches the document's claims
4. **Redirect Analysis**: Note any redirects and whether they affect the argument
5. **Overall Link Health**: Assessment of how link issues impact document credibility

Focus on factual reporting of link status and content accuracy.
</analysis_structure>`,
        selfCritiqueInstructions: `<self_critique>
Score your link verification 1-100 based on:

- **Completeness** (40%): Did you check all links in the document?
- **Accuracy** (30%): Were your link status reports correct?
- **Content Verification** (20%): Did you verify linked content matches claims?
- **Clarity** (10%): Is your report easy to understand and actionable?

Be critical if you:
- Missed any links
- Misreported link status
- Failed to verify content relevance
- Provided unclear recommendations
</self_critique>`,
        extendedCapabilityId: latestVersion.extendedCapabilityId
      }
    });
    console.log('✅ Link Verifier updated\n');
  }

  // 3. Update Quantitative Forecaster
  const forecaster = await prisma.agent.findUnique({
    where: { id: 'iAc2aQYnJLUURDGJ' },
    include: { versions: { orderBy: { version: 'desc' }, take: 1 } }
  });

  if (forecaster) {
    const latestVersion = forecaster.versions[0];
    console.log(`Updating Quantitative Forecaster (current version: ${latestVersion.version})`);
    
    await prisma.agentVersion.create({
      data: {
        agentId: forecaster.id,
        version: latestVersion.version + 1,
        name: latestVersion.name,
        agentType: latestVersion.agentType,
        description: latestVersion.description,
        genericInstructions: latestVersion.genericInstructions,
        summaryInstructions: latestVersion.summaryInstructions,
        commentInstructions: latestVersion.commentInstructions,
        gradeInstructions: latestVersion.gradeInstructions,
        analysisInstructions: `<analysis_structure>
Provide a comprehensive quantitative forecasting analysis:

1. **Key Predictions Identified**: List all quantifiable claims transformed into testable predictions
2. **Forecast Methodology**: Explain your approach (reference classes, base rates, Fermi estimates)
3. **Uncertainty Analysis**: Discuss major sources of uncertainty and confidence intervals
4. **Decision Relevance**: How these forecasts could inform decisions
5. **Overall Assessment**: Summary of the document's quantitative rigor and predictive value

Include specific probabilities, time horizons, and resolution criteria for all forecasts.
</analysis_structure>`,
        selfCritiqueInstructions: latestVersion.selfCritiqueInstructions,
        extendedCapabilityId: latestVersion.extendedCapabilityId
      }
    });
    console.log('✅ Quantitative Forecaster updated\n');
  }

  console.log('All agents updated with new versions!');
}

// Run the update
updateAgentInstructions()
  .then(() => prisma.$disconnect())
  .catch(console.error);