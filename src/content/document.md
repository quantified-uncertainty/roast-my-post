# Developing Value Estimation Systems for AI Safety and EA Projects

This document outlines a comprehensive framework for creating systems that can evaluate AI safety and EA projects. It synthesizes ideas around value estimation, knowledge management, and evaluation methodologies, with a focus on creating consistent, principled assessments.

## Core Concepts and Requirements

### Value Estimation Systems

The central concept involves developing systems that can estimate the value of various entities (projects, initiatives, contributions) in a consistent and principled manner. Key requirements include:

- Ability to assign numerical values and/or qualitative assessments to different items
- Ensuring consistency across multiple evaluations
- Managing uncertainty in evaluations
- Creating persistent knowledge repositories (wikis) to store and refine evaluations
- Applying these evaluations to both controlled environments (like games) and real-world projects

### Knowledge Management Architecture

A critical component is the creation of knowledge repositories that can store and organize evaluations. The proposed architecture includes:

- Project-specific wiki pages with dedicated sections
- Scratchpad areas where evaluation systems (including LLMs) can work through their reasoning
- Structured data repositories for metrics and links
- Versioned evaluation histories to track changes over time

This would ideally be implemented as a lightweight, locally-stored wiki system with appropriate API access for automated systems to read and update.

### Meta-Evaluation Loop

An important feature is the ability to evaluate the evaluation system itself, creating a recursive improvement process:

- The system estimates the value of different projects
- It also estimates the value of contributions to its knowledge base
- Performance in application domains (games, real-world decisions) feeds back to improve valuations
- The system continually refines its evaluation methodologies based on results

## Evaluation Challenges and Solutions

### Consistency in LLM Evaluations

A significant concern is that LLM evaluations might be inconsistent or random. Proposed solutions include:

- Running multiple evaluations to generate distributions rather than point estimates
- Creating plots and visualizations to represent uncertainty
- Using ensemble methods across different models
- Implementing mathematical frameworks to enforce consistency

### Utility Theory Axiom Satisfaction

To ensure evaluations are principled, they should satisfy the axioms of utility theory:

- Completeness: For any two options A and B, the system should consistently express A\>B, B\>A, or A=B
- Transitivity: If A\>B and B\>C, then A\>C
- Independence: Irrelevant alternatives should not affect pairwise rankings
- Continuity: Preferences should be continuous across probability mixtures

Specific testing methodologies have been proposed to verify adherence to these axioms and detect violations.

### Consistency in Multi-Item Evaluations

When evaluating multiple items (e.g., 20 different projects), ensuring global consistency becomes challenging. Proposed approaches include:

- Pairwise comparison matrices to establish relative rankings
- Cardinal utility calibration using anchor points
- Relative value elicitation through ratio and trade-off questions
- Mathematical consistency enforcement using methods like maximum likelihood estimation
- Iterative refinement to address inconsistencies
- Cross-validation across different evaluation instances

### Numerical vs. Textual Evaluations

The system needs to handle both numerical values (easier to aggregate) and textual evaluations (requiring more complex processing):

- Numerical representations: point estimates, probability distributions, multi-dimensional metrics
- Textual representations: qualitative assessments, scenario descriptions, comparative analyses
- Aggregation methods for numerical data: ensemble methods, Bayesian updating, visualization
- Aggregation methods for textual data: semantic similarity metrics, disagreement detection, consensus mapping

## Evaluation Oracle Framework

A key addition to this framework is the concept of **Evaluation Oracles** \- specialized LLM agents designed to provide evaluations over specific domains. This approach draws parallels to forecasting systems but focuses on value estimation rather than prediction.

### Key Components of the Evaluation Oracle Framework

#### Evaluation Oracle

Specific LLM agents trained or prompted to provide evaluations of items over specific domains. These are similar to "forecasters" in prediction markets but focused on value estimation rather than probability forecasting.

#### Evaluation Interface/Abstract/Question

A combination of an Evaluation Intent and a Domain. This is comparable to a "question" in forecasting or a function definition in programming. Examples might include:

- "Rate the expected impact of AI safety interventions on reducing existential risk"
- "Evaluate the cost-effectiveness of EA projects in the global health domain"

#### Domain

A set of potential items that can be evaluated. Domains don't have to be finite and can include hypothetical future items. Examples:

- "All forecasting questions from 2020 to 2025"
- "Any AI safety project that might be created in the future"
- "All of QURI's existing research projects"

#### Domain Sampler

An agent that outputs random items within the given domain. This is valuable for:

- Comparing two Evaluation Oracles on the same items
- Testing consistency across a range of inputs
- Generating diverse test cases for evaluation

#### Meta-Evaluation

An automated evaluation of an Evaluation Oracle itself. This typically checks for:

- Internal consistency (same evaluations for identical inputs)
- Adherence to utility theory axioms
- Calibration against ground truth when available
- Consistency with human expert judgments

### Types of Evaluations

#### Ordinal Rankings

The simplest form of evaluation where the system produces a number for any given input, with higher numbers indicating "better" items. Key properties:

- Ratings of the same element should be consistent
- Rating(A+B) ≥ Rating(A) and Rating(B), if A and B are considered positive

Ordinal rankings can be compared by:

- Examining the distance between rankings for the same items across different oracles
- Using domain samplers to generate random items for comparison when direct comparisons aren't available

#### Linear Rankings

More sophisticated than ordinal rankings, linear rankings produce numbers proportional to the value of inputs, with a clear zero point. Properties:

- All properties of ordinal rankings
- Rating(A) \+ Rating(B) ≤ Rating(A+B) (subadditivity property)

Comparing different linear rankings may require scaling, examining ratios like Rating(A)/Rating(B) across different oracles.

#### Combination Comparisons

The system takes in pairs of items and outputs which is better (optionally with a probability). From sufficient comparisons, ordinal rankings can be generated. Properties:

- Consistency in repeated comparisons
- Transitivity: If A\>B and B\>C, then A\>C
- Maps closely to ordinal rankings with sufficient comparisons (at least NlogN)

### Potential Domains for Evaluation

#### Forecasting Questions

- How valuable would a question be if N hours were dedicated to it?
- What is the current value of a question given existing work on it?
- What is the expected information gain from resolving this question?

#### EA Projects

- How valuable would a project be according to a specific worldview or ethical framework?
- What is the expected impact per dollar spent?
- How does this intervention compare to alternative uses of resources?

#### Evaluation Oracles Themselves

- How reliable is a given Evaluation Oracle?
- How useful is a specific Evaluation Oracle for a particular domain?
- What biases might affect this Oracle's evaluations?

## Evaluation Methodologies

Several competing methodologies have been proposed for project evaluation:

1. **Multi-Model Consensus Engine**: Uses multiple LLMs to independently evaluate projects, with sophisticated aggregation methods to identify areas of consensus and divergence.

2. **Theory of Change Analysis**: Requires explicit articulation of theories of change for each project, then evaluates the logical coherence, empirical support, and feasibility of each step in the causal chain.

3. **Hierarchical Impact Framework**: Creates a comprehensive taxonomy of interventions, evaluating each branch and sub-branch based on expected impact.

4. **Resource Efficiency Optimizer**: Focuses primarily on cost-effectiveness, evaluating projects based on expected impact per dollar/researcher-hour invested.

5. **Longitudinal Progress Tracking**: Establishes baseline metrics and tracks progress over time, creating a dynamic rather than static evaluation system.

6. **Stakeholder Impact Assessment**: Evaluates projects based on systematic interviews with diverse stakeholders, creating a multi-perspective framework.

7. **Value Alignment Verification**: Specialized framework for evaluating how well different approaches actually capture and implement human values.

8. **Empirical Benchmarking System**: Develops concrete benchmarks and empirical tests, focusing on measurable outcomes rather than theoretical promise.

9. **Prediction Market Integration**: Creates specialized prediction markets for outcomes, allowing projects to be evaluated based on collective forecasts.

10. **Red Team Challenge Series**: Establishes adversarial challenges, testing project robustness against skilled opposition.

### Oracle Calibration Process

A new methodological approach not previously discussed is the Oracle Calibration Process:

1. **Anchoring Phase**: The evaluation oracle is calibrated against a set of reference items with established values
2. **Scaling Phase**: The oracle evaluates intermediate items that connect reference points
3. **Extrapolation Testing**: The oracle is tested on extreme cases to assess boundary behavior
4. **Consistency Verification**: Multiple evaluation paths are tested to ensure results are path-independent
5. **Human Oversight Loop**: Human experts review and provide feedback on unusual or counterintuitive evaluations

This process helps ensure that Evaluation Oracles provide consistent, calibrated assessments that align with human values and expectations.

## Implementation Innovations

### Multi-Level Evaluation Architecture

A sophisticated implementation would use a hierarchical system with different types of evaluation at each level:

1. **Base Level**: Simple pairwise comparisons between alternatives
2. **Intermediate Level**: Ordinal rankings within domains
3. **Advanced Level**: Linear rankings with calibrated scales
4. **Integration Level**: Cross-domain value comparisons

This approach allows the system to leverage the strengths of each evaluation type while mitigating weaknesses.

### Bayesian Coherence Framework

A novel approach to ensuring consistency involves using Bayesian methods:

1. Represent all evaluations as probability distributions
2. Use Bayesian updating to integrate new evaluations
3. Identify and resolve inconsistencies through divergence minimization
4. Maintain explicit uncertainty for all evaluations

This framework naturally handles uncertainty and provides principled methods for aggregating evaluations from multiple sources.

### Verification Lottery

To efficiently check consistency without testing all possible combinations:

1. Randomly select evaluation triplets to test for transitivity
2. Probabilistically select higher-value items for more intensive verification
3. Track consistency metrics over time to identify areas needing attention
4. Automatically flag potential violations for human review

This approach makes comprehensive verification tractable even for large domains.

## Example Application Areas

### AI Safety Project Evaluation

A specific application would be evaluating AI safety projects, including:

- Technical alignment research
- Governance initiatives
- Forecasting and monitoring systems
- Capability development with safety considerations

Key considerations include:

- Technical tractability estimates with confidence intervals
- Timeline relevance probabilities
- Neglectedness scores
- Talent bottleneck assessments
- Expected value under different AI development scenarios

### Significant AI Projects (2020-2025)

Twenty significant AI projects from 2020-2025 were identified for potential evaluation:

**Large Language Models & Foundation Models**

- ChatGPT/GPT-4 (OpenAI)
- Claude/Claude 3 Opus (Anthropic)
- Gemini (Google DeepMind)
- Llama 2/3 (Meta)
- Stable Diffusion (Stability AI)

**AI Safety Research**

- Mechanistic Interpretability (Anthropic/various)
- Constitutional AI (Anthropic)
- AI Alignment Research Agendas (MIRI)
- Eliciting Latent Knowledge (Anthropic/ARC)
- Redwood Research's Adversarial Training

**AI Governance & Monitoring**

- AI Act (EU)
- Frontier Model Forum
- NIST AI Risk Management Framework
- Collective Intelligence Project
- AI Vulnerability Database

**AI Capabilities & Applications**

- AlphaFold (DeepMind)
- GitHub Copilot (GitHub/OpenAI)
- DALL-E 3 (OpenAI)
- Multimodal LLMs (various)
- Sora (OpenAI)

### Novel Applications

Additional application areas not previously discussed include:

#### Career Path Evaluation

Applying the framework to evaluate different career paths for impact:

- Expected counterfactual impact in different fields
- Personal fit assessment
- Value of information from exploration

#### Research Direction Prioritization

Helping research organizations allocate resources effectively:

- Expected value of different research questions
- Complementarities between research streams
- Robustness of value across different worldviews

#### Intervention Portfolio Optimization

Designing optimal portfolios of interventions:

- Diversification benefits
- Option value of exploratory work
- Correlation structure between intervention outcomes

## Implementation Proposal

A $50K project proposal was outlined with the following components:

**Phase 1: Framework Development (2 months)**

- Establish evaluation criteria (technical merit, tractability, scalability, etc.)
- Design consistency checks based on utility theory axioms
- Develop protocols for LLM-based evaluations
- Create uncertainty quantification methods
- Pilot test on 3-5 projects and refine methodology

**Phase 2: Comprehensive Evaluation (3 months)**

- Select diverse project portfolio
- Conduct systematic evaluations using multiple methodologies
- Create project-specific wikis documenting all evaluation aspects

**Phase 3: Analysis and Publication (1 month)**

- Synthesize findings into comprehensive evaluations
- Identify patterns across successful/unsuccessful approaches
- Develop interactive visualization tools
- Publish methodology, tools, and findings as open resources

**Budget Allocation ($50,000)**

- Personnel: $30,000
- Expert consultations: $10,000
- LLM API costs: $5,000
- Platform development: $3,000
- Miscellaneous/contingency: $2,000

### Extended Implementation Considerations

Additional implementation details would include:

#### Open Source Toolkit

Developing an open-source toolkit for value estimation:

- Standard interfaces for evaluation oracles
- Libraries for consistency checking
- Visualization tools for evaluation results
- Extensible framework for domain definition

#### Collaborative Evaluation Platform

Creating a platform for collaborative value estimation:

- Multiple evaluators contributing assessments
- Consensus-building mechanisms
- Explicit disagreement tracking
- Credentials system for expertise

#### Evaluation API

Developing an API for integrating evaluations into other systems:

- Standardized query formats
- Structured response objects
- Uncertainty representation
- Authentication and rate limiting

## Practical Example-Based Evaluation

One valuable approach is to provide concrete examples showing how different LLMs approach evaluations. Even without ground truth, these patterns can reveal useful insights:

**Agreement Mapping Across Models**

- Running multiple evaluations across different LLMs
- Plotting agreement matrices showing convergence/divergence
- Example finding: "Model X and Y consistently rate technical alignment research higher than capabilities governance, while model Z shows the opposite pattern"

**Temporal Evolution Analysis**

- Comparing evaluations from earlier vs. newer models
- Example finding: "Newer models consistently assign higher probability to fast takeoff scenarios"

**Consensus Identification**

- Identifying evaluations where even different-generation models agree
- Example finding: "All tested models consistently identified interpretability as high-value regardless of prompting"

These patterns help identify robust conclusions even in the absence of ground truth.

## Technical Implementation Considerations

### Data Architecture

- Project entries with structured metadata
- Scratchpad components for LLM reasoning
- APIs for data fetching from relevant sources
- Versioned evaluations to track changes

### LLM Integration

- API endpoints for LLMs to read and update scratchpads
- Capability to request specific metrics
- Permission systems to control modification rights

### Visualization Layer

- Interactive dashboard with sortable rankings
- Detailed project pages with expanded views
- Uncertainty visualizations
- Comparison tools for related projects

### Update Protocol

- Periodic reviews (monthly/quarterly)
- Human review before finalizing formal evaluations
- Versioning system to track evaluation evolution

### Enhanced Technical Architecture

Additional technical considerations would include:

#### Evaluation Caching System

Implementing a caching system for evaluation results:

- Persistent storage of evaluation outputs
- Invalidation strategies for outdated evaluations
- Query optimization for common evaluation patterns
- Distributed caching for scalability

#### Prompt Engineering Framework

Developing systematic approaches to prompt design:

- Templating system for evaluation prompts
- Version control for prompts
- A/B testing infrastructure for prompt variants
- Automatic prompt optimization

#### Security Considerations

Implementing security measures for the evaluation system:

- Input sanitization to prevent prompt injection
- Rate limiting to prevent denial of service
- Audit logging for evaluation provenance
- Access control for sensitive evaluations

## Research Directions

Key research directions for advancing this framework include:

### Theoretical Foundations

- Axiomatic approaches to value aggregation
- Information-theoretic measures of evaluation quality
- Game-theoretic models of evaluation incentives
- Computational complexity of consistency checking

### Applied Research

- Empirical studies of LLM evaluation consistency
- Comparative analysis of evaluation methodologies
- User studies of evaluation interface design
- Case studies of evaluation in decision-making

### Technical Development

- Scalable algorithms for transitivity enforcement
- Visualization techniques for high-dimensional evaluations
- Efficient sampling methods for domain exploration
- Active learning approaches to optimizing evaluation queries

## Conclusion and Next Steps

The outlined framework provides a comprehensive approach to evaluating AI safety and EA projects in a consistent, principled manner. By combining structured knowledge repositories, multi-model evaluation methodologies, and rigorous consistency checks, it addresses the challenges of making complex value judgments in domains with high uncertainty.

The addition of the Evaluation Oracle framework provides a powerful abstraction for thinking about evaluation systems, with clear parallels to forecasting but focused on value estimation. The distinction between different types of evaluations (ordinal rankings, linear rankings, and combination comparisons) offers a natural progression in evaluation sophistication, allowing systems to start with simpler approaches and evolve toward more comprehensive frameworks.

Implementation would begin with developing the core evaluation framework, followed by applying it to a diverse portfolio of AI safety projects, and concluding with analysis and publication of results. The resulting system would provide the AI safety and EA communities with improved tools for resource allocation, greater transparency in project assessment, and identification of promising but underexplored approaches.

Further refinement would focus on addressing the unique challenges of comparing diverse project types (technical vs. governance), incorporating timeline considerations, developing robust meta-evaluation techniques, and creating mechanisms to correct for evaluator bias.

This system represents a significant step toward more principled, consistent evaluation of complex initiatives in domains with high uncertainty and far-reaching consequences.

## Notes

Key parts

Evaluation Oracle: Specific LLM agents meant to provide evaluations of items over specific domains. Similar to a “prediction” in forecasting.

Evaluation Interface/Abstract/Question: A combination of an Evaluation Intent and a Domain. Very similar to a “_question_” in forecasting, or a function definition.

Domain: A set of potential items that can be evaluated. “All forecasting questions from 2020 to 2025”, for instance. Doesn’t have to be finite. For example, “This takes in any project that might be created in the future.”

Domain Sampler: An agent that outputs random items within the given domain. This is useful for comparing two evaluation oracles.

Meta-Evaluation: An automated evaluation of an Evaluation Oracle. Often checks for measures of consistency.

## Types of Evaluations

### Ordinal Rankings

The LLM system produces a number, for any given input. Inputs with greater numbers are expected to be “better” than inputs with lower numbers. This is the only property that’s guaranteed.

A slightly more complex version of this could have a “zero” point.

Ordinal Rankings can be compared to each other.

It can be fairly straightforward to convert ordinal rankings to linear rankings, given some assumptions. For example, if you have a rating system that takes in a project and outputs a number, consider giving it “that project, plus $1k”. Do this for many dollar values, and many different projects. This could map it to a clean function.

Properties to obey:

- Ratings of the same element should be consistent
- Rating(A+B) \>= Rating(A) and Rating(B), if A and B are considered positive.

Comparing different ratings:

- If you have two distinct lists, you can compare the distance between two different ordinal rankings.
- If you don’t have two distinct lists, you can optionally generate them. This would ideally come with a random generator.
  - This would take the domain, and produce random combinations for said domain.

### Linear Rankings

The LLM system outputs a number for any input. This should be proportional to the value of the input. There should be a clear 0\. This is much harder to do than ordinal rankings, and correspondingly, more controversial.

Properties to obey:

- All from ordinal.
- Rating(A) \+ Rating(B) \<= Rating(A+B)

Comparing different ratings:

- Might need to scale things. What is Rating(A) / Rating(B)? Compare these ratios with each other.

### Combination Comparisons

The LLM takes in two interventions/items. It outputs a value of which is better. This can optionally be a probability.

From this, it’s possible to generate an ordinal ranking, though this takes a bit of work. It takes at least NlogN comparisons.

Comparing different raings:

- Most comparisons would give obvious answers, especially if the answers are not probabilistic. So it’s good to choose some high-information comparisons.

Properties to obey:

- Consistency
- If A\>B and C\>B, C\>A.
- Maps very closely to ordinal.

## Potential Domains

Forecasting Questions

- How valuable would the question be, conditional on it having N hours dedicated to it?
- How valuable would this question be, at the current set of time on it?

EA Projects

- How valuable would it be, to \[some vaegue definition\], assuming \[some worldview, as explained in text\]
- What about just all of QURI’s work?

Evaluation Oracle

- How good do you think a given Evaluation Oracle is?
- How useful do you think a given \[Evaluation Oracle\] | \[Evaluation Question\] is?
