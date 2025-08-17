export const factDocuments = {
  withErrors: `# Historical Technology Milestones

## Early Computing

The first electronic general-purpose computer, ENIAC, was completed in 1942 and weighed approximately 30 tons.
(Error: ENIAC was completed in 1945, not 1942)

The World Wide Web was invented by Tim Berners-Lee at CERN in 1995.
(Error: The WWW was invented in 1989-1991, not 1995)

## Space Exploration

Neil Armstrong became the first person to walk on the moon on July 20, 1971, during the Apollo 11 mission.
(Error: The moon landing was in 1969, not 1971)

The International Space Station was fully completed in 1998 and has been continuously inhabited since then.
(Error: The ISS began construction in 1998 but wasn't completed until 2011, and has been continuously inhabited since November 2000)

## Scientific Discoveries

Albert Einstein published his theory of general relativity in 1905, revolutionizing our understanding of gravity.
(Error: Special relativity was published in 1905, general relativity was published in 1915)

DNA's double helix structure was discovered by Watson and Crick in 1963.
(Error: The discovery was made in 1953, not 1963)

## Technology Companies

Microsoft was founded by Bill Gates and Steve Jobs in 1975.
(Error: Microsoft was founded by Bill Gates and Paul Allen, not Steve Jobs)

Google's search algorithm, PageRank, was developed by Larry Page and Sergey Brin at MIT.
(Error: PageRank was developed at Stanford University, not MIT)`,

  correct: `# Verified Technology Facts

## Computing History

The ENIAC (Electronic Numerical Integrator and Computer) was completed in 1945 at the University of Pennsylvania. It weighed approximately 30 tons and occupied about 1,800 square feet.

Alan Turing published his groundbreaking paper "On Computable Numbers" in 1936, laying the theoretical foundation for modern computing.

The first computer mouse was invented by Douglas Engelbart in 1964 at the Stanford Research Institute.

## Internet and Web

ARPANET, the precursor to the internet, sent its first message on October 29, 1969, between UCLA and Stanford.

Tim Berners-Lee invented the World Wide Web at CERN between 1989 and 1991, with the first website going live on August 6, 1991.

## Mobile Technology

The first commercial mobile phone call was made on October 13, 1983, using the Motorola DynaTAC 8000X.

Apple introduced the iPhone on January 9, 2007, revolutionizing the smartphone industry.

## Scientific Achievements

The Human Genome Project was completed in April 2003, taking 13 years and costing approximately $2.7 billion.

CRISPR-Cas9 gene editing technology was first demonstrated in 2012 by Jennifer Doudna and Emmanuelle Charpentier.`,

  mixedAccuracy: `# Technology Timeline

## Accurate Facts

The transistor was invented at Bell Labs in 1947 by John Bardeen, Walter Brattain, and William Shockley.

The first email was sent by Ray Tomlinson in 1971, and he chose the @ symbol for email addresses.

## Incorrect Claims

Facebook was founded by Mark Zuckerberg at Harvard University in 2006.
(Error: Facebook was founded in 2004, not 2006)

The Bitcoin whitepaper was published by Satoshi Nakamoto in 2010.
(Error: The Bitcoin whitepaper was published in 2008)

## More Accurate Facts

SpaceX successfully landed its first orbital rocket booster on December 21, 2015.

The Large Hadron Collider at CERN began operations on September 10, 2008.

## Additional Errors

Tesla Motors was founded by Elon Musk in 2003.
(Error: Tesla was founded by Martin Eberhard and Marc Tarpenning in 2003; Elon Musk joined in 2004)

The COVID-19 pandemic was declared by the WHO on March 11, 2019.
(Error: The pandemic was declared on March 11, 2020, not 2019)`
};