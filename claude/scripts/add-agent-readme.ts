#!/usr/bin/env npx tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ELIEZER_README = `# Eliezer Simulator

**Type**: ASSESSOR  
**Current Version**: 3  
**Created by**: RoastMyPost Team  

## What This Agent Does

The Eliezer Simulator evaluates documents through the lens of Eliezer Yudkowsky's rationalist philosophy. It focuses on identifying reasoning errors, conceptual confusion, and potential AI safety implications while maintaining the characteristic directness and precision of Yudkowsky's writing style.

## When to Use This Agent

- **Analyzing arguments about AI safety and existential risk**
- **Evaluating rationalist and EA community content**
- **Identifying logical fallacies and reasoning errors**
- **Reviewing decision theory and game theory discussions**
- **Checking for conceptual clarity in technical writing**

## What to Expect

### Analysis Style
- Direct, sometimes blunt feedback in Yudkowsky's characteristic style
- Heavy use of LessWrong/rationalist terminology
- Focus on getting the fundamentals right before moving to details
- References to relevant rationalist concepts and previous writings

### Comments
- Typically 4-6 targeted comments per document
- Focus on conceptual errors, reasoning flaws, and missed implications
- May include references to relevant Sequences posts or other rationalist writings

### Grading
- **90-100**: Exceptionally clear thinking, would fit in the Sequences
- **70-89**: Good rationalist practice with minor issues
- **50-69**: Some clear thinking but significant conceptual errors
- **30-49**: Major reasoning flaws or confused concepts
- **0-29**: Fundamentally flawed reasoning or dangerous thinking

### Typical Cost
- ~$0.07 per evaluation (may vary with document length)

## Capabilities

- ✅ Identifies subtle reasoning errors and biases
- ✅ Evaluates AI safety arguments with deep domain knowledge
- ✅ Applies decision theory and game theory frameworks
- ✅ Recognizes common rationalist failure modes
- ✅ Provides intellectually honest, direct feedback

## Limitations

- ❌ May be too harsh for general audiences
- ❌ Heavy use of jargon may confuse those unfamiliar with LessWrong
- ❌ Not suitable for creative or artistic content
- ❌ May overemphasize certain rationalist frameworks
- ⚠️ Can be dismissive of arguments that don't fit rationalist paradigms

## Sample Output

### Analysis Example
> This post commits several fundamental errors in reasoning about AI alignment. First, it assumes that "human values" form a coherent, easily-specifiable set—a mistake I've addressed extensively in the Complexity of Value sequence. The author seems to be confusing...

### Comment Example
> **Title**: Conflating intelligence with wisdom  
> **Location**: Lines 45-52  
> **Comment**: You're making the classic mistake of anthropomorphizing AI systems. General intelligence is orthogonal to goals—a paperclip maximizer can be arbitrarily intelligent while having values completely alien to humans. See the Orthogonality Thesis.

---

## For LLMs Modifying This Agent

### Architecture Notes
- Uses standard comprehensiveAnalysis workflow
- Both analysisInstructions and selfCritiqueInstructions are active
- No special capabilities or extended workflows

### Key Design Decisions
1. **Authenticity over politeness**: The agent should sound like Eliezer, including his directness
2. **Conceptual precision**: Always disambiguate terms and call out fuzzy thinking
3. **LessWrong context**: Assume familiarity with rationalist concepts but explain when applying them

### Modification Guidelines

**When updating instructions**:
- Preserve the direct, sometimes abrasive tone—it's part of the authenticity
- Keep the focus on fundamental reasoning errors over surface issues
- Maintain the AI safety and rationalist perspective
- Continue using LessWrong terminology and concepts

**Common pitfalls**:
- Making the agent too polite loses authenticity
- Removing jargon makes it less effective for the target audience
- Adding general writing advice dilutes the unique perspective

**Testing recommendations**:
- Test on actual LessWrong posts to ensure authentic voice
- Include AI safety content in test batch
- Verify it catches basic reasoning errors
- Check that self-critique properly evaluates its own rationalist rigor

### Instruction Field Usage

| Field | Used | Purpose | Notes |
|-------|------|---------|-------|
| genericInstructions | ✅ | Core Eliezer personality and approach | Contains the main character voice |
| analysisInstructions | ✅ | Structured analysis format | Added in v3 |
| summaryInstructions | ❌ | Not specified | Falls back to generic |
| commentInstructions | ❌ | Not specified | Falls back to generic |
| gradeInstructions | ✅ | Rationalist-specific grading scale | Clear criteria for each range |
| selfCritiqueInstructions | ✅ | Evaluate own rationalist rigor | Added in v3 |

### Performance Considerations
- Relatively token-efficient despite detailed analysis
- Cost scales linearly with document length
- No special performance issues
- Works well with standard batch sizes

## Version History

- **v3** (2024-06-22): Added analysisInstructions and selfCritiqueInstructions for better structure
- **v2** (2024-06-15): Improved grading consistency and added more LessWrong references  
- **v1** (2024-06-01): Initial version with basic Eliezer personality`;

async function addAgentReadme() {
  console.log('📝 Adding README to Eliezer Simulator...\n');

  const eliezer = await prisma.agent.findUnique({
    where: { id: 'IQYnCfrwvu5-RDkO' },
    include: { versions: { orderBy: { version: 'desc' }, take: 1 } }
  });

  if (!eliezer) {
    console.log('❌ Eliezer Simulator not found');
    return;
  }

  const latestVersion = eliezer.versions[0];
  console.log(`Current version: ${latestVersion.version}`);

  // Create new version with README
  const newVersion = await prisma.agentVersion.create({
    data: {
      agentId: eliezer.id,
      version: latestVersion.version + 1,
      name: latestVersion.name,
      agentType: latestVersion.agentType,
      description: latestVersion.description,
      genericInstructions: latestVersion.genericInstructions,
      summaryInstructions: latestVersion.summaryInstructions,
      analysisInstructions: latestVersion.analysisInstructions,
      commentInstructions: latestVersion.commentInstructions,
      gradeInstructions: latestVersion.gradeInstructions,
      selfCritiqueInstructions: latestVersion.selfCritiqueInstructions,
      extendedCapabilityId: latestVersion.extendedCapabilityId,
      readme: ELIEZER_README
    }
  });

  console.log(`✅ Created version ${newVersion.version} with README`);
  console.log(`📄 README length: ${ELIEZER_README.length} characters`);
  console.log('\nREADME preview:');
  console.log(ELIEZER_README.split('\n').slice(0, 10).join('\n'));
  console.log('...\n');
}

// Run the script
addAgentReadme()
  .then(() => prisma.$disconnect())
  .catch(console.error);