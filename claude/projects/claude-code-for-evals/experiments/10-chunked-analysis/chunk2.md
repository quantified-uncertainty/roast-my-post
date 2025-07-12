# The simple graphical explanation

[Inspired by [this essay](http://www.megasociety.org/noesis/149/iq&pear.html) from Grady Towers]

Suppose you make a scatter plot of two correlated variables. Here's one I grabbed off google, comparing the speed of a ball out of a baseball pitchers hand compared to its speed crossing crossing the plate:

![](http://1.bp.blogspot.com/_CERlGVs2E6w/TT9XffjWAFI/AAAAAAAAAKE/QLNFCdU9JBk/s1600/MarcScatter2.png)

It is unsurprising to see these are correlated (I'd guess the R-square is > 0.8). But if one looks at the extreme end of the graph, the very fastest balls out of the hand *aren't* the very fastest balls crossing the plate, and vice versa. This feature is general. Look at this data (again convenience sampled from googling 'scatter plot') of this:

![](https://www.idlcoyote.com/cg_tips/scatter2d_1.png)

Or this:

![](https://39669.cdn.cke-cs.com/rQvD3VnunXZu34m86e5f/animations/c117d89581350e55f1d6f338f4152b2a8e124d2281a6d5e1.gif)

Or this:

![](https://39669.cdn.cke-cs.com/rQvD3VnunXZu34m86e5f/animations/5d00c1724a678195b72f54a8c32a73f0f44256ab0dbe6dfe.gif)

Given a correlation, the envelope of the distribution should form some sort of *ellipse*, narrower as the correlation goes stronger, and more circular as it gets weaker: (2)

![](http://images.lesswrong.com/t3_km6_2.png?v=2dd17648f5c266ec65ca87364663a4a2)

The thing is, as one approaches the far corners of this ellipse, we see 'divergence of the tails': as the ellipse doesn't sharpen to a point, there are bulges where the maximum x and y values lie with sub-maximal y and x values respectively:

![](http://images.lesswrong.com/t3_km6_3.png)

So this offers an explanation why divergence at the tails is ubiquitous. Providing the sample size is largeish, and the correlation not too tight (the tighter the correlation, the larger the sample size required), one will observe the ellipses with the bulging sides of the distribution. (3)

Hence the very best basketball players aren't the very tallest (and vice versa), the very wealthiest not the very smartest, and so on and so forth for any correlated X and Y. If X and Y are "Estimated effect size" and "Actual effect size", or "Performance at T", and "Performance at T+n", then you have a graphical display of [winner's curse](http://en.wikipedia.org/wiki/Winner's_curse) and [regression to the mean](http://en.wikipedia.org/wiki/Regression_toward_the_mean).