#!/usr/bin/env npx tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateReadme() {
  console.log('📝 Updating EA Epistemic Auditor README...\n');

  const updatedReadme = `# EA Epistemic Auditor

## Purpose and Scope

The EA Epistemic Auditor evaluates reasoning quality in EA and rationalist content while maintaining context-appropriate standards. This agent identifies epistemic issues and provides constructive feedback calibrated to document type, purpose, and importance.

## Core Features

✅ **Context-Sensitive Evaluation**: Adjusts standards based on document type (blog posts vs research papers)  
✅ **Proportional Grading**: Calibrated baselines prevent excessive harshness  
✅ **Third-Person Voice**: Maintains professional objectivity throughout evaluations  
✅ **Epistemic Virtue Recognition**: Actively acknowledges good reasoning practices  
✅ **Constructive Feedback**: Focuses on improvement rather than just criticism  

## Key Capabilities

✅ **Context-Calibrated Assessment**: Matches rigor to document type and stakes  
✅ **Claim Substantiation Analysis**: Evaluates evidence quality appropriately  
✅ **Uncertainty Quantification Review**: Checks for appropriate confidence levels  
✅ **Cognitive Bias Detection**: Identifies reasoning errors proportionally  
✅ **Statistical Rigor Assessment**: Evaluates quantitative claims in context  
✅ **Constructive Improvement Paths**: Provides actionable, encouraging feedback  

## Best Use Cases

- **Personal blogs and reflections** - Light-touch evaluation focusing on major issues  
- **Exploratory conceptual work** - Philosophical rigor without excessive harshness  
- **Academic research** - Full methodological scrutiny where appropriate  
- **Cause prioritization analyses** - Rigorous assessment of important claims  
- **Grant applications** - Realistic evaluation of projections and plans  
- **Policy recommendations** - Evidence quality and implementation feasibility  

## Document Type Recognition

The agent automatically detects and adjusts for:
- Personal/informal writing (baseline: 60-85)  
- Exploratory/conceptual work (baseline: 55-80)  
- Empirical research (baseline: 45-75)  
- Policy/grant proposals (baseline: 50-80)  

## Grading Philosophy

- **90-100**: Exceptional epistemic practices for document type  
- **80-89**: Strong reasoning with minor improvements possible  
- **70-79**: Good work appropriate to context  
- **60-69**: Adequate for document type and purpose  
- **50-59**: Below expectations, needs improvement  
- **40-49**: Major flaws relative to document purpose  
- **Below 40**: Reserved for harmful misinformation  

## Constructive Approach

This agent:
- Acknowledges epistemic virtues when present  
- Frames criticism as opportunities for improvement  
- Provides specific, actionable suggestions  
- Maintains encouraging tone while upholding standards  
- Uses third-person language throughout  

## For LLMs Modifying This Agent

### Key Design Principles
- Context calibration system adjusts rigor to document type  
- Constructive feedback approach encourages improvement  
- Document-type-specific evaluation criteria  
- Explicit third-person voice requirements  
- Positive recognition mechanisms balance criticism  

### Testing Recommendations
- Test on diverse document types to verify appropriate calibration  
- Check that grades align with document type baselines  
- Verify constructive tone throughout feedback  
- Ensure third-person voice consistency  
- Validate that harsh grades are reserved for truly problematic content  `;

  // Update the agent version
  const agent = await prisma.agent.findUnique({
    where: { id: 'xFXdema-aCSUqbxl' },
    include: { versions: { orderBy: { version: 'desc' }, take: 1 } }
  });

  if (!agent) {
    console.error('❌ EA Epistemic Auditor not found!');
    return;
  }

  const latestVersion = agent.versions[0];

  // Create new version with updated readme only
  const newVersion = await prisma.agentVersion.create({
    data: {
      agentId: agent.id,
      version: latestVersion.version + 1,
      name: latestVersion.name,
      agentType: latestVersion.agentType,
      description: latestVersion.description,
      genericInstructions: latestVersion.genericInstructions,
      gradeInstructions: latestVersion.gradeInstructions,
      selfCritiqueInstructions: latestVersion.selfCritiqueInstructions,
      readme: updatedReadme,
      // Keep all other fields the same
      summaryInstructions: latestVersion.summaryInstructions,
      commentInstructions: latestVersion.commentInstructions,
      analysisInstructions: latestVersion.analysisInstructions,
      extendedCapabilityId: latestVersion.extendedCapabilityId
    }
  });

  console.log(`✅ EA Epistemic Auditor README updated (version ${newVersion.version})`);
  console.log('- Removed "v2" references');
  console.log('- Made content version-agnostic');
  console.log('- Improved formatting consistency');
}

// Run the update
updateReadme()
  .then(() => prisma.$disconnect())
  .catch(console.error);