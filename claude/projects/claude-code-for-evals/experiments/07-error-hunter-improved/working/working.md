# Error Hunting Progress - input.md

## Overview
- Started: 2025-07-10T05:22:23.909Z
- Target: Find specific, actionable errors with exact quotes and line numbers
- Max iterations: 6

## Tasks
1. Find typos and grammatical errors
2. Verify numerical claims
3. Check mathematical statements
4. Identify logical contradictions
5. Fact-check people and organizations
6. Verify citations and references

## Errors Found

### Iteration 1: Find typos and grammatical errors

1. **Repeated word** (Line 23)
   - Text: "comparing the speed of a ball out of a baseball pitchers hand compared to its speed crossing crossing the plate"
   - Error: The word "crossing" is repeated
   - Fix: Remove one instance of "crossing"

2. **Missing apostrophe** (Line 23)
   - Text: "a baseball pitchers hand"
   - Error: Missing possessive apostrophe in "pitchers"
   - Fix: Should be "pitcher's hand"

3. **Missing space before bracket** (Line 7)
   - Text: "to[ lifespan](http://www.bmj.com/content/322/7290/819)"
   - Error: No space between "to" and the opening bracket
   - Fix: Add space: "to [lifespan]"

4. **Missing space before bracket** (Line 9)
   - Text: "the very highest earners tend[ to be very smart]"
   - Error: No space between "tend" and the opening bracket
   - Fix: Add space: "tend [to be very smart]"

5. **Grammatical error - double conjunction** (Line 15)
   - Text: "Maybe although having a faster serve is better all things being equal, but focusing too heavily"
   - Error: Using both "although" and "but" creates a grammatical error
   - Fix: Remove either "although" or "but" - e.g., "Maybe having a faster serve is better all things being equal, but focusing too heavily..."

*Completed*

### Iteration 2: Verify numerical claims
*Pending...*

### Iteration 3: Check mathematical statements

1. **Confusion between R and R-squared** (Line 71)
   - Text: "The R-square measure of correlation between two sets of data is the same as the cosine of the angle between them when presented as vectors"
   - Error: This is incorrect. The correlation coefficient R (not R-squared) equals the cosine of the angle between vectors
   - Fix: Should be "The R measure of correlation" or "The correlation coefficient R"

2. **Incorrect angle calculation** (Line 75)
   - Text: "Grant a factor correlated with an outcome, which we represent with two vectors at an angle theta, the inverse cosine equal the R-squared"
   - Error: Again confusing R and R-squared. The angle theta = arccos(R), not arccos(R²)
   - Fix: Should be "the inverse cosine equal to R" or "the angle theta = arccos(R)"

3. **Mathematical inconsistency** (Line 75)
   - Text: "For concreteness (and granting normality), an R-square of 0.5 (corresponding to an angle of sixty degrees)"
   - Error: If R² = 0.5, then R ≈ 0.707, and arccos(0.707) ≈ 45°, not 60°. The author seems to be treating R² = 0.5 as if R = 0.5, where arccos(0.5) = 60°
   - Fix: Either "R of 0.5 (corresponding to an angle of sixty degrees)" or "R-square of 0.5 (corresponding to an angle of forty-five degrees)"

4. **Incorrect formula application** (Line 99)
   - Text: "this makes it clear why you can by R-squared to move between z-scores of correlated normal variables"
   - Error: Missing word "multiply" and incorrect - you multiply by R (not R-squared) to get expected z-score
   - Fix: "why you can multiply by R to move between z-scores"

5. **Misstatement about R-squared** (Line 27)
   - Text: "It is unsurprising to see these are correlated (I'd guess the R-square is > 0.8)"
   - Error: An R-squared > 0.8 represents extremely strong correlation. The author likely means R > 0.8 (which would give R² > 0.64)
   - Fix: Either "R is > 0.8" or "R-square is > 0.64"

*Completed*

### Iteration 4: Identify logical contradictions

1. **Contradiction about trade-offs** (Lines 15-17)
   - First statement (Line 15): "Maybe being taller at basketball is good *up to a point*, but being really tall leads to greater costs in terms of things like agility."
   - Second statement (Line 17): "it would be weird if there was always a 'too much of a good thing' story to be told for all of these associations."
   - Contradiction: First suggests trade-offs exist, then dismisses the universality of trade-offs
   - Issue: The author presents trade-offs as a plausible explanation, then rejects it without adequate justification

2. **Contradiction about practical relevance** (Lines 79-81)
   - First statement (Line 79): "It generally vindicates worries about regression to the mean or winner's curse, and suggests that these will be pretty insoluble"
   - Second statement (Line 81): "This probably has limited practical relevance."
   - Contradiction: Claims the phenomenon is both "insoluble" (suggesting significant impact) and of "limited practical relevance"
   - Issue: If it's truly insoluble and affects our ability to identify the best options, it should have substantial practical relevance

3. **Contradiction about independence** (Lines 57-58)
   - Setup (Line 57): "independent of one another and are normally distributed"
   - Later claim (Line 57): "the toy model stipulates there aren't 'hidden trade-offs': there's no negative correlation between intelligence and conscientiousness"
   - Contradiction: The author conflates "independence" with "no negative correlation" - independence means zero correlation, not just absence of negative correlation
   - Fix: Should clarify that independence means zero correlation, which already rules out trade-offs

4. **Contradiction about sample size requirements** (Lines 47 and 91)
   - First statement (Line 47): "Providing the sample size is largeish, and the correlation not too tight (the tighter the correlation, the larger the sample size required)"
   - Second statement (Line 91): "the tighter the correlation, the larger the sample needed to fill in the sub-maximal bulges"
   - Contradiction with example (Line 93): Shows Old Faithful as tight correlation forming a "point" - but this contradicts the claim that tighter correlations need larger samples to show divergence
   - Issue: The logic is backwards - tighter correlations should need smaller samples to see the pattern, not larger

5. **Self-contradicting confidence** (Lines 95 and 97)
   - Line 95: "It's clear that this model is fairly easy to extend to >2 factor cases"
   - Line 97: "My intuition is that... But I can't see an obvious derivation, and I'm too lazy to demonstrate it myself. Sorry!"
   - Contradiction: Claims clarity and ease in one place, then admits inability to derive or demonstrate in another
   - Issue: Undermines the author's authority by simultaneously claiming understanding and admitting laziness/inability

*Completed*

### Iteration 5: Fact-check people and organizations

1. **Potentially outdated claim about Bill Gates** (Line 87)
   - Text: "if Bill Gates is ~+4SD in intelligence, despite being the richest man in america"
   - Issue: While accurate for 2014 when written, this claim becomes outdated as wealth rankings change
   - Note: Bill Gates was indeed the richest American in 2014, but readers in later years might find this confusing as rankings fluctuate
   - Fix: Consider adding a date reference or using more timeless examples

2. **Imprecise population statistics** (Lines 59 and 61)
   - Text: "with 10 people at +4SD, you wouldn't expect any of them to be +2SD in conscientiousness" and "if 10 at +4SD, around 500 at +3SD"
   - Issue: These numbers lack context about the total population being considered
   - Error: The ratio is approximately correct (should be ~470:10, claimed ~500:10), but without specifying the population size, these absolute numbers are meaningless
   - Fix: Should specify "in a population of X" or use ratios instead of absolute numbers

3. **Unexplained acronym** (Line 83)
   - Text: "perhaps instead of funding AMF to diminishing returns"
   - Issue: AMF (Against Malaria Foundation) is not defined anywhere in the document
   - Error: Readers unfamiliar with EA terminology won't know what AMF refers to
   - Fix: Should spell out "Against Malaria Foundation (AMF)" on first use

4. **Missing context for NBA height evolution** (Line 7)
   - Text: "the average height in the NBA is around 6'7""
   - Issue: NBA average height peaked at 6'7" in 1987 and has been declining since
   - Note: While accurate for 2014, this statistic changes over time and lacks temporal context
   - Fix: Could add "as of 2014" or "historically" for clarity

5. **Vague organization reference** (Line 15)
   - Text: "a stratospherically high IQ has an increased risk of productivity-reducing mental illness"
   - Issue: Links to "prometheussociety.org" without explaining what the Prometheus Society is
   - Error: The organization (a high-IQ society) is not introduced or explained
   - Fix: Should briefly explain "according to the Prometheus Society (a high-IQ organization)" or similar

*Completed*

### Iteration 6: Verify citations and references

1. **Dead/problematic link - cross-post** (Line 3)
   - Text: "[cross-post](http://www.thepolemicalmedic.com/2014/07/tails-come-apart/)"
   - Error: The domain thepolemicalmedic.com appears to be dead/inactive
   - Issue: Readers cannot access the original post, defeating the purpose of a cross-post link
   - Fix: Remove link or note that it's no longer available

2. **Image without attribution** (Lines 25, 29, 33, 37, 41, 45, 65, 73, 93)
   - Multiple images embedded:
     - Line 25: Baseball scatter plot from blogspot
     - Line 29: Scatter plot from idlcoyote.com
     - Lines 33, 37: GIF animations from CKEditor CDN
     - Lines 41, 45, 65, 73: LessWrong hosted images
     - Line 93: Wikipedia Old Faithful image
   - Error: No attribution, source citation, or copyright information for any images
   - Issue: Potential copyright violations, especially for the blogspot and commercial site images
   - Fix: Add source attributions, check licensing, or replace with properly licensed images

3. **Broken Wikipedia link structure** (Line 7)
   - Text: "[6'7"](http://en.wikipedia.org/wiki/NBA_league_average_height,_weight,_age_and_playing_experience)"
   - Error: Wikipedia doesn't use underscores in URLs with commas; this link structure is malformed
   - Issue: Link likely returns 404 or redirects incorrectly
   - Fix: Verify correct Wikipedia URL or find alternative source

4. **Incomplete/relative citation** (Line 57)
   - Text: "[_ceteris paribus_](/lw/km6/why_the_tails_come_apart/b8ph)"
   - Error: Uses relative URL that only works on LessWrong platform
   - Issue: Readers outside LessWrong cannot access this reference
   - Fix: Provide full URL or explain it's a comment reference on the original post

5. **Missing citation for strong claim** (Line 75)
   - Text: "an R-square of 0.5 is remarkably strong in the social sciences, implying it accounts for half the variance"
   - Error: No citation for this claim about what constitutes "remarkably strong" in social sciences
   - Issue: This is a field-specific claim that needs supporting evidence
   - Fix: Add citation to methodology textbook or paper discussing effect sizes in social sciences

*Completed*