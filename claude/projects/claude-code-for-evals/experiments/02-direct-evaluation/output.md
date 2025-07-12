# Evaluation: "Why the tails fall apart"

## Summary of Main Argument

This blog post explores a fascinating statistical phenomenon: when two variables are correlated, their extreme values (tails) diverge systematically. The author demonstrates that even with strong correlations between predictors and outcomes, the most extreme values of the predictor rarely correspond to the most extreme values of the outcome, and vice versa. For instance, the tallest people aren't the best basketball players, and the fastest tennis servers aren't the best players. The post provides three complementary explanations: a graphical visualization showing how correlation ellipses create bulges at the extremes, an intuitive explanation based on multiple contributing factors, and a geometric explanation using vector angles and R-squared values.

## Strengths of the Post

The post excels in several key areas. First, the author provides exceptional clarity through multiple explanatory frameworks - graphical, intuitive, and geometric - ensuring readers with different backgrounds can grasp the concept. The progression from concrete examples (basketball height, tennis serves, IQ and wealth) to abstract mathematical principles is pedagogically sound and engaging. The author's intellectual humility is commendable, openly acknowledging limitations ("I'm too lazy to demonstrate it myself") and inviting mathematical experts to strengthen the arguments.

The practical relevance section connecting to Effective Altruism demonstrates real-world implications beyond academic curiosity. The author thoughtfully considers how this phenomenon affects charity evaluation and career selection, warning against overconfidence in identifying "the best" options. The visual aids, particularly the scatter plots and ellipse diagrams, effectively illustrate abstract concepts, making the mathematical intuition accessible to non-specialists.

## Weaknesses and Areas for Improvement

While comprehensive, the post could benefit from stronger mathematical rigor. The author relies heavily on intuition and visual arguments without providing formal proofs or derivations. For instance, the claim that "the envelope of the distribution should form some sort of ellipse" assumes multivariate normality without explicit justification. The geometric explanation using R-squared as cosine of angles between vectors lacks the promised derivation, leaving readers to accept it on faith.

The toy model using intelligence and conscientiousness to explain wealth is oversimplified and potentially misleading. Real-world factors rarely follow normal distributions or maintain independence, particularly at extremes. The post would benefit from discussing how violations of these assumptions affect the conclusions. Additionally, while the author mentions non-normal distributions (like income) in footnotes, the main text doesn't adequately address how the phenomenon manifests with different distributional shapes.

The writing occasionally becomes verbose and repetitive. The same core insight - that extreme predictors don't yield extreme outcomes - is restated multiple times without adding substantial new understanding. Some sections, particularly the geometric explanation, assume mathematical sophistication that may exceed the target audience's background.

## Specific Examples from the Text

The post's strength lies in its concrete examples. The basketball height illustration (lines 7-9) immediately grounds the abstract concept: "there are many thousands of US men taller than the average NBA player, yet are not in the NBA." This visceral example helps readers grasp why being +4SD in height doesn't guarantee being +4SD in basketball ability.

The scatter plot analysis (lines 23-38) effectively demonstrates the universality of the phenomenon across different domains. However, the author's admission of "convenience sampled from googling 'scatter plot'" undermines scientific rigor - carefully selected examples could strengthen the argument's empirical foundation.

The toy model explanation (lines 57-61) provides valuable intuition: "with 10 people at +4SD, you wouldn't expect any of them to be +2SD in conscientiousness." This crystallizes why extreme outliers in one dimension rarely achieve extreme outlier status in multi-factor outcomes. Yet the model's assumptions (equal importance, independence, normality) are unrealistic for most real-world applications.

The EA relevance section (lines 77-83) thoughtfully applies the concept to practical decision-making, though it somewhat contradicts itself by suggesting we should "spread funds sooner" while maintaining that "your best bet remains your estimate." This tension deserves deeper exploration.

## Conclusion

"Why the tails fall apart" presents a genuinely insightful observation about statistical relationships with important practical implications. The post succeeds in making a complex statistical phenomenon intuitive through multiple explanatory approaches and concrete examples. While it would benefit from greater mathematical rigor and more careful treatment of assumptions, it effectively challenges our intuitions about extreme values and correlations. The author's intellectual honesty and invitation for improvement exemplify good scientific communication. For readers in fields dealing with prediction and optimization, understanding why "tails come apart" provides a valuable corrective to overconfidence in identifying truly optimal choices.