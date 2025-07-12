# Document Analysis Strategy: Finding Clear Flaws

## Core Principle: Focus on Objective, High-Impact Issues

Our system prioritizes **clear flaws** - objective errors that meaningfully impact the document's reliability or conclusions. We avoid subjective style preferences and nitpicky corrections.

## Document Classification & Flaw Density

### 🔬 **High Flaw Density Documents** 
*Extensive analysis justified*

**Technical/Mathematical Documents**
- Code, models, statistical analyses, research papers
- **High potential for clear flaws**: Math errors, logical bugs, invalid assumptions
- **Analysis depth**: Comprehensive (8-12 tasks)
- **Example**: Squiggle UBI model → statistical validity, mathematical accuracy, code quality

**Empirical Research**
- Data-driven studies, systematic reviews, meta-analyses  
- **High potential for clear flaws**: Methodology errors, data issues, invalid conclusions
- **Analysis depth**: Comprehensive (8-10 tasks)

### 📊 **Medium Flaw Density Documents**
*Targeted analysis*

**Policy/Analysis Papers**
- Think tank reports, policy recommendations, structured arguments
- **Moderate potential for clear flaws**: Logical inconsistencies, unsupported claims
- **Analysis depth**: Focused (4-6 tasks)
- **Focus**: Argument strength, logical consistency, factual verification

### 💭 **Low Flaw Density Documents**
*Minimal analysis*

**Opinion/Conceptual Essays**
- Blog posts, opinion pieces, conceptual frameworks
- **Low potential for clear flaws**: Mainly internal contradictions, major logical gaps
- **Analysis depth**: Light (2-4 tasks)
- **Focus**: Internal consistency, major argument flaws only
- **Example**: AI Intellectuals essay → logical consistency, argument strength only

**Personal Narratives**
- Memoirs, experience reports, personal reflections
- **Very low potential for clear flaws**: Minimal objective errors possible
- **Analysis depth**: Minimal (1-2 tasks)

## Task Selection Rules

### Rule 1: Empirical Claims Drive Empirical Tasks
```
IF document makes specific empirical claims (statistics, data, research citations)
THEN include: factual_verification, citation_accuracy, statistical_validity
ELSE skip these tasks
```

### Rule 2: Technical Content Drives Technical Tasks  
```
IF document contains math/code/formal models
THEN include: mathematical_accuracy, code_quality, statistical_validity  
ELSE skip these tasks
```

### Rule 3: Argument Structure Drives Logic Tasks
```
IF document makes structured arguments or policy recommendations
THEN include: logical_consistency, argument_strength
ELSE focus only on internal_consistency
```

### Rule 4: Skip Nitpicky Tasks for Conceptual Work
```
IF document_type == "opinion_essay" OR "conceptual_framework"
THEN skip: spelling_grammar, citation_accuracy, clarity_readability
FOCUS only on: logical_consistency, major_contradictions
```

## Severity Thresholds by Document Type

### Technical Documents: Low Threshold
- **Critical**: Any mathematical error, invalid assumption, broken code
- **Major**: Questionable methodology, missing validation
- **Minor**: Documentation gaps, minor code style issues

### Empirical Research: Low Threshold  
- **Critical**: Invalid methodology, unsupported conclusions
- **Major**: Missing data, questionable statistics
- **Minor**: Citation formatting, presentation issues

### Policy/Analysis: Medium Threshold
- **Critical**: Major logical contradictions, fundamentally unsupported recommendations
- **Major**: Weak evidence for key claims, missing considerations
- **Minor**: Skip most minor issues

### Opinion Essays: High Threshold
- **Critical**: Only major internal contradictions, completely unsupported sweeping claims
- **Major**: Skip most issues unless they undermine core argument
- **Minor**: Skip entirely

## Examples Applied

### ✅ Good Analysis Allocation

**Squiggle UBI Model** (Technical)
- 🎯 **High effort**: 5 focused tasks on math/stats/code
- 🔍 **Found**: Critical GDP calculation error, statistical assumption problems
- ✅ **Result**: Valuable, actionable feedback

**AI Intellectuals Essay** (Opinion) - *Fixed Approach*
- 🎯 **Low effort**: 2 tasks only (logical_consistency, argument_strength)  
- 🔍 **Would find**: Major contradictions, dismissing counterarguments
- ✅ **Result**: Only high-value issues, no nitpicking

### ❌ Poor Analysis Allocation

**AI Intellectuals Essay** (Opinion) - *Current Approach*
- 💸 **High effort**: 8 tasks including citation_accuracy, spelling_grammar
- 🔍 **Found**: "Claude needs explanation", "scary is informal", typos
- ❌ **Result**: Mostly noise, low value

## Implementation Strategy

### Document Type Detection
```javascript
function classifyDocument(content, metadata) {
  // Check for technical indicators
  if (hasMath || hasCode || hasStatistics) return "technical";
  
  // Check for empirical research indicators  
  if (hasDataClaims || hasMethodology || hasSystematicCitations) return "empirical";
  
  // Check for policy/analysis indicators
  if (hasRecommendations || hasStructuredArgument) return "policy_analysis";
  
  // Default to opinion/conceptual
  return "opinion_essay";
}
```

### Task Selection Logic
```javascript
const TASK_RULES = {
  technical: {
    required: ["mathematical_accuracy", "statistical_validity", "code_quality"],
    optional: ["logical_consistency", "clarity_readability"],
    skip: []
  },
  empirical: {
    required: ["factual_verification", "citation_accuracy", "statistical_validity"],
    optional: ["argument_strength", "clarity_readability"], 
    skip: []
  },
  policy_analysis: {
    required: ["logical_consistency", "argument_strength"],
    optional: ["factual_verification"],
    skip: ["spelling_grammar", "citation_accuracy"]
  },
  opinion_essay: {
    required: ["logical_consistency"],
    optional: ["argument_strength"],
    skip: ["spelling_grammar", "citation_accuracy", "clarity_readability", "factual_verification"]
  }
};
```

## Success Metrics

- **Technical docs**: Find real mathematical/statistical errors
- **Empirical research**: Find methodology and data issues  
- **Policy papers**: Find logical gaps and unsupported claims
- **Opinion essays**: Find only major contradictions and argument flaws

**Goal**: Every finding should be actionable and meaningfully improve the document. Avoid generating lists of minor issues that authors will ignore.