# Integration Example: Hidden Assumptions Module

## Before vs After Comparison

### Current Version (Abstract)
```yaml
<hidden_assumptions>
  <purpose>Surface unstated premises the argument depends on</purpose>
  <structure>
    ## 👻 Hidden Assumptions
    
    **Unstated premises:**
    - Assumes: [assumption] → But: [why questionable]
    - Assumes: [assumption] → Alternative view: [different framework]
    
    **Keystone assumption:** [which assumption, if false, collapses the argument]
  </structure>
</hidden_assumptions>
```

### Expanded Version (First 20% shown)
```yaml
<hidden_assumptions>
  <purpose>Surface unstated premises the argument depends on, with concrete techniques and examples</purpose>
  
  <overview>
    Hidden assumptions are the invisible foundation of arguments - beliefs so fundamental 
    the author doesn't even realize they're making them. Finding these requires specific 
    techniques and practice. This module teaches you how to uncover assumptions that 
    would surprise and enlighten the target audience.
  </overview>
  
  <detection_techniques>
    <negation_test>
      <description>Take a claim, negate it, and ask what must be true for the original to hold</description>
      
      <detailed_process>
        1. Identify a core claim in the document
        2. Write its logical negation
        3. Ask: "What would have to be false for the negation to be true?"
        4. Those prerequisites are likely hidden assumptions
      </detailed_process>
      
      <example_1>
        <original_claim>We should prioritize x-risk reduction over global poverty</original_claim>
        <negation>We should NOT prioritize x-risk reduction over global poverty</negation>
        
        <revealed_assumptions>
          - Future people matter morally (not just potential people)
          - We can meaningfully affect x-risk probability
          - Small probability × large impact > large probability × small impact
          - Our x-risk estimates are accurate enough to act on
          - Neglecting present suffering is acceptable for future benefit
        </revealed_assumptions>
        
        <quality_insight>
          The most controversial hidden assumption is that neglecting present 
          suffering is acceptable - many ethical frameworks would reject this.
        </quality_insight>
      </example_1>
    </negation_test>
  </detection_techniques>
  
  [... continues with 5 more detection techniques, each with 2-3 examples ...]
</hidden_assumptions>
```

## Example Output Comparison

### Document Being Analyzed
"Given the potential for transformative AI within 10-30 years, the EA community should shift 80% of resources from global health to AI safety research."

### Current Agent Output
```markdown
## 👻 Hidden Assumptions

**Unstated premises:**
- Assumes: AI timeline predictions are accurate → But: Expert disagreement exists
- Assumes: Resources are fungible → Alternative view: Specialized talent pools

**Keystone assumption:** Technical solutions can prevent AI risks
```

### Expanded Agent Output
```markdown
## 👻 Hidden Assumptions

**Unstated premises detected:**

1. **Assumes: We can meaningfully predict AI development 10-30 years out**
   - Found via: Negation test - "We cannot predict AI development timelines"
   - Evidence: "within 10-30 years" (Line 1) stated without uncertainty bounds
   - But: Previous 30-year tech predictions (flying cars, fusion) mostly failed
   - Alternative view: Deep uncertainty requires robust decision-making, not point estimates

2. **Assumes: Global health progress will continue without EA resources**
   - Found via: Counterfactual analysis
   - Evidence: Implicit in "shift 80% of resources" (Line 2)
   - But: EA comprises 20-40% of certain neglected disease funding
   - Alternative view: Withdrawal could reverse decade of progress

3. **Assumes: AI safety research productivity scales linearly with funding**
   - Found via: Causal chain analysis (funding → research → safety)
   - Evidence: No mention of diminishing returns or bottlenecks
   - But: Talent constraints may bind before funding
   - Alternative view: Small expert teams might outperform large funded efforts

4. **Assumes: Future generations have equal moral weight to present suffering**
   - Found via: Framework dependency analysis
   - Evidence: Prioritizing "potential" over actual current deaths
   - But: This is a controversial philosophical position
   - Alternative view: Person-affecting views, discount rates, special obligations

**Keystone assumption:** EA's marginal contribution to AI safety is more decisive than to global health
- Why it's crucial: Entire reallocation argument depends on this
- Probability it's false: ~40% (AI safety may progress without EA; global health may stagnate without)
- If false, then: Resource allocation should consider comparative advantage, not just cause importance
```

## Key Improvements

### 1. **Specific Techniques**
- Names each detection method used
- Shows exactly HOW the assumption was found
- Provides step-by-step process reader could replicate

### 2. **Concrete Evidence**
- Quotes specific lines from the document
- Points to what's present AND absent
- Shows the logical moves being made

### 3. **Nuanced Alternatives**
- Not just "this could be wrong"
- Specific alternative frameworks
- Real counterexamples from EA/rationalist discourse

### 4. **Probability Estimates**
- Keystone assumption includes rough probability
- Shows reasoning behind estimate
- Clarifies what changes if false

### 5. **Domain-Specific Examples**
- Uses real EA/rationalist concepts
- References actual debates in the community
- Understands audience's philosophical background

## Implementation Path

### Phase 1: Single Module Test
1. Implement expanded Hidden Assumptions module
2. A/B test on 10 documents
3. Measure:
   - Insight quality (human rated 1-5)
   - Specificity (generic vs specific feedback)
   - Actionability (can author improve based on this?)
   - Reader value (would EA Forum readers appreciate this?)

### Phase 2: Gradual Expansion
If Phase 1 shows improvement:
1. Expand Cognitive Biases module (with EA-specific biases)
2. Expand Quantitative Claims module (with EA metrics)
3. Expand Alternative Interpretations (with philosophical frameworks)

### Phase 3: Dynamic Loading
- Create modular system
- Load relevant modules based on document type
- Cache frequently used patterns
- Build library of best examples

## Cost-Benefit Analysis

### Costs
- 4x token usage (2.5k → 10k per module)
- Increased latency (more processing)
- Development time for examples
- Testing and refinement

### Benefits
- Higher quality insights
- More consistent output
- Educational value for users
- Building corpus of EA epistemic patterns
- Reduced need for follow-up clarification

### ROI Estimate
If expanded module produces 2x better insights (measured by user feedback), and costs 4x more tokens, the key question is: Do users value quality over quantity?

For epistemic evaluation, the answer is likely yes - one deep insight is worth more than four shallow observations.