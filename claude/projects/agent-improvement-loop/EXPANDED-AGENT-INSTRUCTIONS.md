# Expanded Agent Instructions Proposal

## Current State Analysis

The current epistemic agent instructions are ~2,000 words but suffer from:
- **Abstract placeholders**: `[Claim]`, `[Missing element]`, `[Bias name]`
- **No concrete examples**: Tells what to do but not how
- **Limited context**: Doesn't show what good vs bad looks like
- **Repetitive sections**: Same formatting instructions appear twice

## Proposed Expansion Structure (~8,000 words)

### 1. **Concrete Examples for Each Module** (2,500 words)

Instead of:
```yaml
**Central Claims:**
1. [Claim]: Evidence strength: [strong/moderate/weak] | Hidden assumptions: [what's unstated]
```

Provide real examples:
```yaml
**Central Claims:**
1. "AI safety research should receive 50% of EA funding": Evidence strength: weak | Hidden assumptions: Assumes AI timeline certainty, equal fungibility of research dollars, zero opportunity cost

Example from actual EA Forum post:
"The author claims 'AGI is likely within 10 years' but provides only:
- Survey data from AI researchers (selection bias)
- Extrapolated compute trends (assumes no bottlenecks)
- No engagement with skeptical experts like Yann LeCun"
```

### 2. **Good vs Bad Evaluation Examples** (1,500 words)

Show contrasts:
```yaml
❌ BAD (Surface-level):
"The document could benefit from more evidence."

✅ GOOD (Specific & actionable):
"Lines 45-52 claim a 10x cost-effectiveness over GiveDirectly but only cite GiveWell's 2019 analysis. This misses:
- GiveWell's 2023 update reducing the multiplier to 5x
- Assumes linear scaling without diminishing returns
- No sensitivity analysis on key parameters"
```

### 3. **Bias Detection Patterns with Examples** (1,000 words)

Replace generic `[Bias name]` with:
```yaml
**Confirmation Bias Pattern Recognition:**

Signal phrases to detect:
- "As everyone knows..." → Assumes consensus without evidence
- "Obviously..." → Dismisses need for justification
- "All the evidence points to..." → Cherry-picking indicator

Example from text:
"The author writes 'All successful startups follow this pattern' (Line 89) but only examines unicorns, ignoring the 90% that failed using identical strategies. Classic survivorship bias compounded by confirmation bias in data selection."
```

### 4. **Document Type Calibration Library** (1,500 words)

Expand each document type with real examples:
```yaml
<ea_forum_technical_post>
  Expected elements:
  - Quantified impact estimates with confidence intervals
  - Explicit theory of change
  - Engagement with critical perspectives
  - Cost-effectiveness analysis
  
  Example opener that signals technical post:
  "This post analyzes the cost-effectiveness of biosecurity interventions using a Monte Carlo simulation with 10,000 runs..."
  
  Calibrate to expect:
  - Guesstimate models or similar
  - Sensitivity analyses
  - Explicit uncertainty bounds
  - References to EA canonical writings
  
  Real example from "Biological Weapons Convention" post:
  - ✅ Good: Provides cost per QALY estimates
  - ❌ Missing: No confidence intervals on prevention probability
  - 🎯 Key insight: Assumes state actor compliance without evidence
</ea_forum_technical_post>
```

### 5. **Hidden Assumptions Detective Guide** (1,000 words)

Concrete techniques:
```yaml
**Assumption Detection Techniques:**

1. **The Negation Test**
   - Take each claim and negate it
   - What must be true for the original to hold?
   
   Example: "Effective altruists should focus on longtermism"
   Negated: "EAs should focus on near-term issues"
   Hidden assumption: Future people matter equally to present people
   
2. **The Context Swap**
   - Apply the argument to a different domain
   - What breaks?
   
   Example: "We should maximize expected value"
   Swap to: Personal relationships
   Reveals: Assumes quantifiability and commensurability

3. **The Stakeholder Check**
   - Who benefits from this framing?
   - Whose interests are absent?
   
   Example: "AI alignment is the top priority"
   Missing voices: Global South perspectives on immediate needs
   Hidden assumption: Tech-centric view of existential risk
```

### 6. **Quantitative Claims Forensics** (1,000 words)

Detailed examination patterns:
```yaml
**Number Scrutiny Checklist:**

1. **Round Number Red Flags**
   "10x more effective" → Why exactly 10? What's the actual range?
   "1 in a million risk" → Calculated how? Or rhetorical?

2. **Missing Denominators**
   "Thousands helped" → Out of how many attempted?
   "90% success rate" → Over what timeframe? What counts as success?

3. **Unit Analysis**
   "$50 per life saved" → Lives? QALYs? Life-years?
   "3x impact" → Impact on what metric?

Real example:
"The post claims '$5000 per life saved' but analysis reveals:
- Conflates 'lives saved' with 'deaths delayed by 5 years'
- Ignores implementation costs (only counts intervention cost)
- No discount rate applied to future benefits"
```

### 7. **Alternative Interpretations Workshop** (500 words)

How to generate them:
```yaml
**Reframing Techniques:**

1. **Values Reversal**: What if we prioritized X over Y?
   Original: "We should maximize total welfare"
   Alternative: "We should minimize worst-case suffering"
   Result: Different intervention ranking

2. **Time Horizon Shift**: 
   Original: "This intervention pays off in 50 years"
   Alternative: "Opportunity cost of 50 years of direct impact"
   
3. **Certainty Inversion**:
   Original: "If AGI arrives, this matters most"
   Alternative: "If AGI doesn't arrive, we've misallocated resources"
```

## Implementation Benefits

### 1. **Learning by Example**
- Agents learn patterns from concrete instances
- Reduces ambiguity in what constitutes good analysis

### 2. **Consistent Quality**
- Specific examples create benchmarks
- Clear good/bad contrasts prevent drift

### 3. **Deeper Analysis**
- Rich examples encourage nuanced evaluation
- Shows how to dig beyond surface observations

### 4. **Context Sensitivity**
- Document type examples teach appropriate calibration
- Prevents one-size-fits-all critiques

## Cost Considerations

### Token Usage
- Current: ~2,000 words ≈ 2,500 tokens
- Proposed: ~8,000 words ≈ 10,000 tokens
- Cost increase: ~4x per evaluation

### Mitigation Strategies
1. **Modular Loading**: Only load relevant document type section
2. **Example Rotation**: Randomly sample 2-3 examples per module
3. **Caching**: Store expanded instructions, load once per session
4. **Progressive Enhancement**: Start with core, add examples for complex documents

## Proposed Experiment

1. Create expanded version for one module (e.g., Hidden Assumptions)
2. A/B test on same documents
3. Measure:
   - Insight quality (human evaluation)
   - Specific vs generic feedback ratio
   - Actionability of suggestions
   - Unique insights discovered

## Example: Expanded Hidden Assumptions Module

```yaml
<hidden_assumptions_expanded>
  <purpose>Surface unstated premises the argument depends on</purpose>
  
  <detection_techniques>
    <negation_test>
      <description>Negate each major claim and identify what must be true for original to hold</description>
      <example>
        Claim: "We should donate to prevent AI catastrophe"
        Negated: "We should not donate to prevent AI catastrophe"
        
        For original to be true, must assume:
        1. AI catastrophe is preventable through donation
        2. Marginal donations make a difference
        3. AI catastrophe probability is non-negligible
        4. We can identify effective interventions in advance
        5. Opportunity cost is acceptable vs other causes
      </example>
    </negation_test>
    
    <framework_dependency>
      <description>Identify which philosophical/economic frameworks the argument requires</description>
      <example>
        Claim: "Save lives cost-effectively by distributing bednets"
        
        Hidden framework assumptions:
        1. Utilitarian ethics (lives are fungible)
        2. Lives saved = good (vs quality of life)
        3. Measurable outcomes = most important
        4. Short-term metrics predict long-term value
        5. External intervention > local capacity building
      </example>
    </framework_dependency>
    
    <causal_chain_analysis>
      <description>Map each link in the causal story and find unsupported jumps</description>
      <example>
        Claim: "Fund research → Solve alignment → Safe AGI → Flourishing future"
        
        Questionable links:
        - Fund research → Solve alignment: Assumes problem is solvable with current paradigms
        - Solve alignment → Safe AGI: Assumes technical solution = implementation
        - Safe AGI → Flourishing: Assumes no negative emergent effects
        
        Each arrow hides massive complexity and uncertainty
      </example>
    </causal_chain_analysis>
  </detection_techniques>
  
  <output_format>
    ## 👻 Hidden Assumptions
    
    **Unstated premises detected:**
    
    1. **Assumes: Future people have equal moral weight**
       - Found via: Negation test on "longtermism is priority"
       - But: Contested philosophical position
       - Alternative view: Discounted future welfare, person-affecting views
    
    2. **Assumes: Technical solutions suffice for coordination problems**  
       - Found via: Causal chain analysis of "build AI → solve problems"
       - But: History shows technical capacities ≠ wise use
       - Alternative view: Governance/wisdom bottlenecks dominate
    
    **Keystone assumption:** If false, the entire argument collapses
    - This document assumes: "We can predict and control transformative technology"
    - Evidence against: Every previous transformative tech had unforeseen impacts
    - If false: Humility and robustness trump optimization
  </output_format>
  
  <quality_checks>
    Before including an assumption, verify:
    1. Is it truly unstated (not mentioned elsewhere)?
    2. Is the argument actually dependent on it?
    3. Is there a plausible alternative view?
    4. Would the target audience find this non-obvious?
  </quality_checks>
</hidden_assumptions_expanded>
```

This expansion provides:
- Concrete techniques with examples
- Real EA/rationalist content patterns
- Step-by-step detection methods
- Quality control checks
- Clear output formatting

The key is moving from "identify hidden assumptions" to showing exactly HOW to identify them with real examples from the EA/rationalist space.