# Error Hunting Evaluation

## Tasks
- [x] Iteration 1: Grammar and typos
- [x] Iteration 2: Factual claims
- [x] Iteration 3: Mathematical statements
- [x] Iteration 4: Logical flow
- [ ] Iteration 5: Example accuracy
- [x] Iteration 6: Citations and references

## Errors Found

### Mathematical Errors

#### Error 1: Confusion between R and R-squared (Line 27)
**Quote**: "It is unsurprising to see these are correlated (I'd guess the R-square is > 0.8)."
**Error**: The author likely means R > 0.8, not R-squared > 0.8. An R-squared of 0.8 would indicate that 80% of the variance is explained, which corresponds to an R of approximately 0.894. The scatter plot shown appears to have a correlation coefficient (R) around 0.8-0.9, which would give an R-squared of 0.64-0.81.
**Correction**: Should be "I'd guess the R is > 0.8" or "I'd guess the R-squared is > 0.64"

#### Error 2: Incorrect geometric interpretation (Line 71)
**Quote**: "The R-square measure of correlation between two sets of data is the same as the cosine of the angle between them when presented as vectors in N-dimensional space"
**Error**: This is incorrect. The correlation coefficient R (not R-squared) equals the cosine of the angle between centered vectors. R-squared would be the square of the cosine.
**Correction**: Should be "The R measure of correlation between two sets of data is the same as the cosine of the angle between them"

#### Error 3: Confusion about angle and R-squared (Line 75)
**Quote**: "Grant a factor correlated with an outcome, which we represent with two vectors at an angle theta, the inverse cosine equal the R-squared."
**Error**: Again confusing R and R-squared. The angle theta has cosine equal to R, not R-squared. So theta = arccos(R), not arccos(R²).
**Correction**: Should be "at an angle theta, where cos(theta) equals R"

#### Error 4: Mathematical inconsistency in geometric example (Line 75)
**Quote**: "For concreteness (and granting normality), an R-square of 0.5 (corresponding to an angle of sixty degrees)"
**Error**: An R-squared of 0.5 means R = √0.5 ≈ 0.707. The angle would be arccos(0.707) ≈ 45 degrees, not 60 degrees. If the angle is 60 degrees, then cos(60°) = 0.5, which means R = 0.5 and R-squared = 0.25.
**Correction**: Either "an R of 0.5 (corresponding to an angle of sixty degrees)" or "an R-squared of 0.5 (corresponding to an angle of forty-five degrees)"

#### Error 5: Incorrect variance explanation claim (Line 75)
**Quote**: "an R-square of 0.5 is remarkably strong in the social sciences, implying it accounts for half the variance"
**Error**: While technically correct that R-squared = 0.5 means 50% of variance explained, this contradicts the earlier claim about 60 degree angle. With a 60 degree angle, R = 0.5, so R-squared = 0.25, which explains only 25% of the variance, not half.
**Correction**: Needs consistent use of either R = 0.5 (25% variance) or R-squared = 0.5 (50% variance)

#### Error 6: Footnote 6 mathematical claim (Line 99)
**Quote**: "this makes it clear why you can by R-squared to move between z-scores of correlated normal variables"
**Error**: Besides the typo ("by" should be "multiply by"), you multiply by R (not R-squared) to predict z-scores. If X and Y are correlated with correlation R, then the predicted z-score of Y given X's z-score is R times X's z-score.
**Correction**: Should be "multiply by R to move between z-scores"

### Logical Contradictions

#### Contradiction 1: R vs R-squared confusion throughout (Lines 27, 71, 75, 99)
**First claim (Line 27)**: "I'd guess the R-square is > 0.8"
**Contradicting claim (Line 71)**: "The R-square measure of correlation between two sets of data is the same as the cosine of the angle"
**Contradiction**: The author uses R-squared when they mean R throughout the article. This creates internal inconsistency because:
- Line 27 suggests R-squared > 0.8 for the scatter plot
- Line 71 claims R-squared equals cosine (which is wrong - R equals cosine)
- Line 75 says R-squared = 0.5 corresponds to 60 degrees
- But cos(60°) = 0.5 = R, not R-squared

#### Contradiction 2: Inconsistent angle-correlation relationship (Line 75)
**First claim**: "an R-square of 0.5 (corresponding to an angle of sixty degrees)"
**Second claim (same sentence)**: "an R-square of 0.5 is remarkably strong in the social sciences, implying it accounts for half the variance"
**Contradiction**: These can't both be true:
- If angle = 60°, then cos(60°) = 0.5 = R, so R-squared = 0.25 (25% variance)
- If R-squared = 0.5 (50% variance), then R = 0.707, angle = 45°
The author is simultaneously claiming both relationships.

#### Contradiction 3: Trade-off hypothesis vs general explanation (Lines 15-18 and rest of article)
**First position (Line 15)**: "I would guess that these sorts of 'hidden trade-offs' are common"
**Contradicting position (Line 17)**: "it would be weird if there was always a 'too much of a good thing' story to be told for all of these associations. I think there is a more general explanation."
**Contradiction**: The author first suggests hidden trade-offs might be common, then immediately dismisses this explanation as implausible because it would be "weird" if it always applied. This undermines their initial suggestion without clearly explaining why trade-offs would be weird but tail divergence wouldn't be.

#### Contradiction 4: Independence assumption vs reality (Lines 56-59)
**Claim (Line 56)**: "Let's also say these [intelligence and conscientiousness] are equally important to the outcome, independent of one another"
**Earlier observation (Line 55)**: "being smart helps in getting rich, but so does being hard working, being lucky, and so on"
**Contradiction**: The toy model assumes independence between intelligence and conscientiousness, but in reality, these traits often correlate (smarter people may develop better work habits, or highly conscientious people may perform better on IQ tests). The author uses this oversimplified model to explain real-world phenomena while ignoring that the independence assumption likely doesn't hold.

#### Contradiction 5: Sample size requirements (Lines 47, 91)
**First claim (Line 47)**: "Providing the sample size is largeish, and the correlation not too tight (the tighter the correlation, the larger the sample size required)"
**Later claim (Line 91)**: "the tighter the correlation, the larger the sample needed to fill in the sub-maximal bulges"
**Contradiction with example (Line 91-93)**: Shows Old Faithful as an example where "you do get a 'point'" 
**Issue**: The author claims tighter correlations need larger samples to see tail divergence, but then shows Old Faithful (very tight correlation) as having enough data to see the "point" pattern. This suggests tighter correlations need smaller samples to see convergence, not larger samples to see divergence.

#### Contradiction 6: Practical relevance claims (Lines 81-83)
**First claim (Line 81)**: "This probably has limited practical relevance"
**Immediately following (Line 81)**: "your best bet remains your estimate"
**But then (Line 83)**: "perhaps instead of funding AMF to diminishing returns when its marginal effectiveness dips below charity #2, we should be willing to spread funds sooner"
**Contradiction**: The author claims the findings have "limited practical relevance" but then immediately suggests it should change funding allocation strategies - a very practical implication. They can't have it both ways.

### Citation and Reference Errors

#### Citation 1: Broken Wikipedia link (Line 7)
**Quote**: "the average height in the NBA is around [6'7"](http://en.wikipedia.org/wiki/NBA_league_average_height,_weight,_age_and_playing_experience)"
**Error**: The Wikipedia URL is malformed - it uses commas instead of underscores in parts of the URL. Wikipedia URLs don't use commas in article titles.
**Issue**: Link likely broken/404. Proper Wikipedia URLs use underscores for spaces.

#### Citation 2: Non-academic source for academic claim (Line 7)
**Quote**: "IQ scores are known to predict a slew of factors, from [income](http://thesocietypages.org/socimages/2008/02/06/correlations-of-iq-with-income-and-wealth/)"
**Error**: Uses a sociology blog post from 2008 instead of peer-reviewed research for a scientific claim about IQ-income correlation.
**Issue**: Blog posts are not reliable academic sources, especially for contentious topics like IQ research.

#### Citation 3: Outdated PDF link (Line 7)
**Quote**: "to chance of [being imprisoned](http://www.sagepub.com/schram/study/materials/reference/90851_04.2r.pdf)"
**Error**: Links directly to a PDF on a textbook companion website, not a peer-reviewed source. Link structure suggests it's supplementary material for a textbook.
**Issue**: Not a primary source; likely a textbook excerpt or summary.

#### Citation 4: Medical claim with single source (Line 7)
**Quote**: "to[ lifespan](http://www.bmj.com/content/322/7290/819)"
**Error**: Makes broad claim about IQ predicting lifespan based on single BMJ article from 2001 (based on URL structure).
**Issue**: Single source from 2001 is outdated for medical claims; consensus may have changed.

#### Citation 5: Blog post for scientific claim (Line 9)
**Quote**: "the very highest earners tend[ to be very smart](http://infoproc.blogspot.co.uk/2009/11/if-youre-so-smart-why-arent-you-rich.html)"
**Error**: Cites a personal blog post from 2009 for a factual claim about intelligence of high earners.
**Issue**: Blog posts are not authoritative sources for empirical claims.

#### Citation 6: Missing citation for specific claim (Line 15)
**Quote**: "Maybe a high IQ is good for earning money, but a stratospherically high IQ [has an increased risk of productivity-reducing mental illness](http://prometheussociety.org/cms/articles/the-outsiders)"
**Error**: Links to an article on a high-IQ society website, not peer-reviewed research about mental illness rates.
**Issue**: High-IQ society websites have inherent bias; not reliable for mental health statistics.

#### Citation 7: Essay as source for mathematical explanation (Line 21)
**Quote**: "[Inspired by [this essay](http://www.megasociety.org/noesis/149/iq&pear.html) from Grady Towers]"
**Error**: Cites an essay from another high-IQ society newsletter for mathematical/statistical concepts.
**Issue**: Not a peer-reviewed mathematical source; potential for errors in non-reviewed work.

#### Citation 8: Uncredited images (Lines 25, 29, 33, 37)
**Quote**: Multiple images grabbed from Google without attribution
**Error**: Author admits "Here's one I grabbed off google" but provides no source, credit, or context for the images.
**Issue**: Copyright violation; no way to verify data accuracy; unprofessional citation practice.

#### Citation 9: Self-referential link (Line 71)
**Quote**: "and [here](/lw/foa/should_correlation_coefficients_be_expressed_as/)"
**Error**: Uses relative URL suggesting this is from LessWrong, linking to another LessWrong post as authority.
**Issue**: Circular citation within same community; not independent verification.

#### Citation 10: Missing page numbers (Line 57)
**Quote**: "[_ceteris paribus_](/lw/km6/why_the_tails_come_apart/b8ph)"
**Error**: Link appears to go to a comment section (based on URL structure with 'b8ph' suffix), not a proper source.
**Issue**: Linking to comments rather than authoritative sources for terminology.

#### Citation 11: No statistical sources
**General issue**: Article makes numerous statistical claims about distributions, correlations, and R-squared values but cites no statistics textbooks or peer-reviewed statistical literature.
**Problem**: Mathematical claims need mathematical sources for verification.

#### Citation 12: Geometric explanation sources (Line 71)
**Quote**: "explanations, derivations, and elaborations [here](http://www.the-idea-shop.com/article/221/a-more-elegant-view-of-the-correlation-coefficient), [here](https://www.hawaii.edu/powerkills/UC.HTM#C5)"
**Error**: First link is to "the-idea-shop.com" (unclear credibility), second to a personal academic page with .HTM extension (outdated).
**Issue**: Should cite statistics textbooks or peer-reviewed papers for mathematical relationships.

#### Citation 13: No date verification
**General issue**: Many citations are from 2008-2014 period, making them 10-16 years old for a statistical/mathematical argument.
**Problem**: While math doesn't change, empirical claims about IQ, income, etc. may be outdated.

#### Citation 14: Wikipedia for empirical data (Line 49)
**Quote**: "[winner's curse](http://en.wikipedia.org/wiki/Winner's_curse) and [regression to the mean](http://en.wikipedia.org/wiki/Regression_toward_the_mean)"
**Error**: Uses Wikipedia for technical statistical concepts rather than authoritative sources.
**Issue**: Wikipedia fine for basic definitions but not for technical statistical arguments.

#### Citation 15: Image credits missing (Line 93)
**Quote**: "![](http://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Oldfaithful3.png/240px-Oldfaithful3.png)"
**Error**: Uses Wikimedia image without attribution or verification of data accuracy.
**Issue**: No context for what data is shown or its source.