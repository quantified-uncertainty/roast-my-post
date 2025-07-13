import { analyzeSpellingGrammarDocument } from "../spellingGrammarWorkflow";
import { analyzeSpellingGrammarDocumentParallel } from "../parallelSpellingGrammarWorkflow";
import type { Document } from "../../../../types/documents";
import type { Agent } from "../../../../types/agentSchema";

/**
 * Comprehensive integration tests with real Claude API
 * Each test document has known errors with expected outputs
 */

describe("Comprehensive Spelling & Grammar Integration Tests", () => {
  const TIMEOUT = 120000; // 2 minutes per test

  const grammarAgent: Agent = {
    id: "grammar-test",
    name: "Grammar Checker",
    agentVersionId: "v1",
    primaryInstructions: "Find all spelling, grammar, punctuation, and capitalization errors. Be thorough and precise.",
    purpose: "ASSESSOR",
    description: "Checks documents for spelling and grammar errors",
    providesGrades: true,
    extendedCapabilityId: "spelling-grammar"
  };

  // Test Document 1: Technical Article with Known Errors
  const technicalDoc: Document = {
    id: "tech-doc",
    title: "Technical Documentation",
    author: "Test Author",
    content: `Introduction to Kubernets

Kubernetes is an open-source container orchestration platform that automate the deployment, scaling, and management of containerized applications. It was originaly developed by Google and are now maintained by the Cloud Native Computing Foundation.

Key Concepts:

1. Pods: The smalest deployable units in Kubernetes. A pod represent a single instance of a running process in your cluster.

2. Services: An abstract way to expose an application runing on a set of Pods as a network service. Kubernetes give Pods their own IP addresses and a single DNS name for a set of Pods, and can load-balance across them.

3. Deployments: Provide declarative updates for Pods and ReplicaSets. You describe a desired state in a Deployment, and the Deployment Controller change the actual state to the desired state at a controlled rate.

Common Misconfigurations:

- Not setting resource limits can lead to pods consuming to much memory
- Forgeting to configure health checks may result in unhealthy pods recieving traffic
- Using latest tags for images make deployments unpredictable

Best Practises:

Always use specific image tags, not "latest". This ensure reproducible deployments.
Set both requests and limits for CPU and memory. This help the scheduler make better decisions.
Use namespaces to organize resources. Its easier to manage permissions and quotas this way.

Conclusion

Kubernetes has revolutionized the way we deploy and manage applications. While it have a steep learning curve, the benefits it provide in terms of scalability, reliability, and maintainability make it worth the investment. As more organizations adopt cloud-native architectures, Kubernetes skill will become increasingly valuable.

Remember: with great power come great responsibility. Always test your configurations thoroughly before deploying to production!`,
    importUrl: "https://example.com/k8s-intro",
    platform: "test",
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const expectedTechnicalErrors = [
    { text: "Kubernets", type: "spelling", correction: "Kubernetes" },
    { text: "automate", type: "grammar", correction: "automates" },
    { text: "originaly", type: "spelling", correction: "originally" },
    { text: "are now maintained", type: "grammar", correction: "is now maintained" },
    { text: "smalest", type: "spelling", correction: "smallest" },
    { text: "represent", type: "grammar", correction: "represents" },
    { text: "runing", type: "spelling", correction: "running" },
    { text: "give", type: "grammar", correction: "gives" },
    { text: "change", type: "grammar", correction: "changes" },
    { text: "to much", type: "grammar", correction: "too much" },
    { text: "Forgeting", type: "spelling", correction: "Forgetting" },
    { text: "recieving", type: "spelling", correction: "receiving" },
    { text: "make", type: "grammar", correction: "makes" },
    { text: "Practises", type: "spelling", correction: "Practices" },
    { text: "ensure", type: "grammar", correction: "ensures" },
    { text: "help", type: "grammar", correction: "helps" },
    { text: "Its", type: "punctuation", correction: "It's" },
    { text: "it have", type: "grammar", correction: "it has" },
    { text: "provide", type: "grammar", correction: "provides" },
    { text: "skill", type: "grammar", correction: "skills" },
    { text: "come", type: "grammar", correction: "comes" }
  ];

  // Test Document 2: Business Email with Common Mistakes
  const businessEmailDoc: Document = {
    id: "email-doc",
    title: "Business Email",
    author: "Test Author",
    content: `Subject: Proposal for Q4 Marketing Initiativs

Dear Mr. johnson,

I hope this email find you well. I wanted to reach out regarding our upcomming marketing initiatives for Q4 2024.

As we discussed in our last meeting, their are several key areas we need to address:

Budget Allocation:
- Social media campaigns needs $50,000
- influencer partnerships requires $30,000
- Content creation need $20,000

The total budget request are $100,000, which represent a 20% increase from last quarter. This increase are justified by the following factors:

1. Market research shows that our competitiors are investing heavily in digital marketing
2. Our current campaigns is underperforming due to insufficient funding
3. The holiday season demand more aggressive marketing efforts

Timeline and Milestones:

Phase 1 (October): Launch social media campaigns
Phase 2 (november): Begin influencer outreach
Phase 3 (December): Ramp up content production

Each phases will be carefully monitored to ensure we're meeting our KPIs. The marketing team are committed to delivering exceptional results.

Next Steps:

Please review the attached proposal and let me know if you have any questions. Id be happy to schedule a call to discuss this further. We need your approval by october 15th to proceed with the planned timeline.

Thank you for you're time and consideration. I look forward to hearing from you soon.

Best Regards,
Sarah Chen
Marketing Director

PS - Dont forget about the team meeting on friday at 2pm!`,
    importUrl: "https://example.com/business-email",
    platform: "test",
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const expectedEmailErrors = [
    { text: "Initiativs", type: "spelling", correction: "Initiatives" },
    { text: "johnson", type: "capitalization", correction: "Johnson" },
    { text: "find", type: "grammar", correction: "finds" },
    { text: "upcomming", type: "spelling", correction: "upcoming" },
    { text: "their", type: "grammar", correction: "there" },
    { text: "needs", type: "grammar", correction: "need" },
    { text: "influencer", type: "capitalization", correction: "Influencer" },
    { text: "requires", type: "grammar", correction: "require" },
    { text: "need", type: "grammar", correction: "needs" },
    { text: "are", type: "grammar", correction: "is" },
    { text: "represent", type: "grammar", correction: "represents" },
    { text: "are", type: "grammar", correction: "is" },
    { text: "competitiors", type: "spelling", correction: "competitors" },
    { text: "is", type: "grammar", correction: "are" },
    { text: "demand", type: "grammar", correction: "demands" },
    { text: "november", type: "capitalization", correction: "November" },
    { text: "phases", type: "grammar", correction: "phase" },
    { text: "are", type: "grammar", correction: "is" },
    { text: "Id", type: "punctuation", correction: "I'd" },
    { text: "october", type: "capitalization", correction: "October" },
    { text: "you're", type: "grammar", correction: "your" },
    { text: "Dont", type: "punctuation", correction: "Don't" },
    { text: "friday", type: "capitalization", correction: "Friday" }
  ];

  // Test Document 3: Academic Paper Excerpt
  const academicDoc: Document = {
    id: "academic-doc",
    title: "Academic Paper",
    author: "Test Author",
    content: `Abstract

This paper examine the impact of social media on adolescent mental health. Our research team have conducted a comprehensive study involving 500 participants aged 13-18 over a period of six month. The findings suggests that excessive social media use are correlated with increased anxiety and depression among teenagers.

Introduction

In recent years, the proliferation of social media platforms have raised concerns about their impact on young peoples mental health. While these platforms offers opportunities for connection and self-expression, they also poses risks that requires careful consideration.

Previous studies has shown mixed results. Smith et al (2022) found that moderate social media use can enhances social connections, while Jones and williams (2023) argued that any amount of use are potentially harmful. Our study aim to reconcile these conflicting findings by examining the relationship between usage patterns and mental health outcomes more closely.

Methodology

Participants was recruited from five high schools in the greater boston area. Each participant were required to complete daily surveys about their social media usage and mood. We also collected data from there social media accounts (with permission) to verify self-reported usage.

The data collection process lasted from january to june 2024. During this time, participants social media habits was monitored using a custom-built tracking application. This allowed us to gather accurate informations about not just time spent, but also the types of interactions participants engaged in.

Key Findings

Our analysis reveal several important patterns:

1. Participants who spent more then 4 hours daily on social media reported 40% higher anxiety levels
2. The correlation between usage and depression were strongest among female participants
3. Passive consumption (scrolling without interacting) had a more negative affect than active engagement
4. Time of day mattered - late night usage was particulary problematic

These finding suggests that its not just the amount of time spent on social media, but also how and when its used that effects mental health outcomes.`,
    importUrl: "https://example.com/academic-paper",
    platform: "test",
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const expectedAcademicErrors = [
    { text: "examine", type: "grammar", correction: "examines" },
    { text: "have", type: "grammar", correction: "has" },
    { text: "month", type: "grammar", correction: "months" },
    { text: "suggests", type: "grammar", correction: "suggest" },
    { text: "are", type: "grammar", correction: "is" },
    { text: "have", type: "grammar", correction: "has" },
    { text: "peoples", type: "punctuation", correction: "people's" },
    { text: "offers", type: "grammar", correction: "offer" },
    { text: "poses", type: "grammar", correction: "pose" },
    { text: "requires", type: "grammar", correction: "require" },
    { text: "has", type: "grammar", correction: "have" },
    { text: "enhances", type: "grammar", correction: "enhance" },
    { text: "williams", type: "capitalization", correction: "Williams" },
    { text: "are", type: "grammar", correction: "is" },
    { text: "aim", type: "grammar", correction: "aims" },
    { text: "was", type: "grammar", correction: "were" },
    { text: "boston", type: "capitalization", correction: "Boston" },
    { text: "were", type: "grammar", correction: "was" },
    { text: "there", type: "grammar", correction: "their" },
    { text: "january", type: "capitalization", correction: "January" },
    { text: "june", type: "capitalization", correction: "June" },
    { text: "participants", type: "punctuation", correction: "participants'" },
    { text: "was", type: "grammar", correction: "were" },
    { text: "informations", type: "grammar", correction: "information" },
    { text: "reveal", type: "grammar", correction: "reveals" },
    { text: "then", type: "grammar", correction: "than" },
    { text: "were", type: "grammar", correction: "was" },
    { text: "affect", type: "grammar", correction: "effect" },
    { text: "particulary", type: "spelling", correction: "particularly" },
    { text: "finding", type: "grammar", correction: "findings" },
    { text: "its", type: "punctuation", correction: "it's" },
    { text: "its", type: "punctuation", correction: "it's" },
    { text: "effects", type: "grammar", correction: "affects" }
  ];

  // Helper function to check if expected errors are found
  function analyzeResults(
    documentName: string,
    expectedErrors: Array<{ text: string; type: string; correction: string }>,
    foundHighlights: any[],
    showDetails: boolean = true
  ) {
    const foundTexts = new Set(
      foundHighlights.map(h => h.highlight.quotedText.toLowerCase())
    );
    
    const foundErrors = expectedErrors.filter(e => 
      foundHighlights.some(h => 
        h.highlight.quotedText.toLowerCase().includes(e.text.toLowerCase())
      )
    );
    
    const missedErrors = expectedErrors.filter(e => 
      !foundHighlights.some(h => 
        h.highlight.quotedText.toLowerCase().includes(e.text.toLowerCase())
      )
    );

    const accuracy = (foundErrors.length / expectedErrors.length) * 100;

    if (showDetails) {
      console.log(`\n=== ${documentName} Results ===`);
      console.log(`Expected errors: ${expectedErrors.length}`);
      console.log(`Found errors: ${foundHighlights.length}`);
      console.log(`Correctly identified: ${foundErrors.length}/${expectedErrors.length} (${accuracy.toFixed(1)}%)`);
      
      if (missedErrors.length > 0) {
        console.log(`\nMissed errors (${missedErrors.length}):`);
        missedErrors.slice(0, 5).forEach(e => {
          console.log(`  - "${e.text}" (${e.type}) → "${e.correction}"`);
        });
        if (missedErrors.length > 5) {
          console.log(`  ... and ${missedErrors.length - 5} more`);
        }
      }

      console.log(`\nSample found errors:`);
      foundHighlights.slice(0, 5).forEach((h, i) => {
        console.log(`  [${i + 1}] "${h.highlight.quotedText}" - ${h.description.split('\n')[0]}`);
      });
    }

    return { accuracy, foundErrors, missedErrors };
  }

  // Test 1: Technical Documentation (Sequential)
  test("analyzes technical documentation with known errors", async () => {
    const result = await analyzeSpellingGrammarDocument(
      technicalDoc,
      grammarAgent,
      100 // Allow many highlights to catch all errors
    );

    const { accuracy } = analyzeResults(
      "Technical Documentation",
      expectedTechnicalErrors,
      result.highlights
    );

    // Should find at least 80% of known errors
    expect(accuracy).toBeGreaterThanOrEqual(80);
    expect(result.grade).toBeLessThan(90); // Should have a lower grade due to errors
    expect(result.analysis).toContain("Spelling & Grammar Analysis");
    expect(result.tasks.length).toBeGreaterThan(0);
  }, TIMEOUT);

  // Test 2: Business Email (Parallel)
  test("analyzes business email with parallel processing", async () => {
    const result = await analyzeSpellingGrammarDocumentParallel(
      businessEmailDoc,
      grammarAgent,
      100,
      3 // Process 3 chunks at a time
    );

    const { accuracy } = analyzeResults(
      "Business Email",
      expectedEmailErrors,
      result.highlights
    );

    // Should find at least 80% of known errors
    expect(accuracy).toBeGreaterThanOrEqual(80);
    expect(result.summary).toContain("error");
    expect(result.analysis).toContain("parallel");
  }, TIMEOUT);

  // Test 3: Academic Paper (Compare Sequential vs Parallel)
  test("compares sequential vs parallel processing", async () => {
    console.log("\n=== Sequential vs Parallel Comparison ===");
    
    // Sequential processing
    const sequentialStart = Date.now();
    const sequentialResult = await analyzeSpellingGrammarDocument(
      academicDoc,
      grammarAgent,
      100
    );
    const sequentialTime = Date.now() - sequentialStart;

    // Parallel processing
    const parallelStart = Date.now();
    const parallelResult = await analyzeSpellingGrammarDocumentParallel(
      academicDoc,
      grammarAgent,
      100,
      5 // Process 5 chunks at a time
    );
    const parallelTime = Date.now() - parallelStart;

    console.log(`\nProcessing times:`);
    console.log(`Sequential: ${(sequentialTime / 1000).toFixed(1)}s`);
    console.log(`Parallel: ${(parallelTime / 1000).toFixed(1)}s`);
    console.log(`Speed improvement: ${((sequentialTime - parallelTime) / sequentialTime * 100).toFixed(1)}%`);

    // Both should find similar errors
    const seqAccuracy = analyzeResults(
      "Academic Paper (Sequential)",
      expectedAcademicErrors,
      sequentialResult.highlights,
      false
    ).accuracy;

    const parAccuracy = analyzeResults(
      "Academic Paper (Parallel)",
      expectedAcademicErrors,
      parallelResult.highlights,
      false
    ).accuracy;

    console.log(`\nAccuracy comparison:`);
    console.log(`Sequential: ${seqAccuracy.toFixed(1)}%`);
    console.log(`Parallel: ${parAccuracy.toFixed(1)}%`);

    // Results should be similar
    expect(Math.abs(seqAccuracy - parAccuracy)).toBeLessThan(10);
    expect(Math.abs(sequentialResult.highlights.length - parallelResult.highlights.length)).toBeLessThan(5);
  }, TIMEOUT * 2);

  // Test 4: Clean Document (Negative Test)
  test("handles clean document with no errors", async () => {
    const cleanDoc: Document = {
      ...technicalDoc,
      content: `Introduction to Kubernetes

Kubernetes is an open-source container orchestration platform that automates the deployment, scaling, and management of containerized applications. It was originally developed by Google and is now maintained by the Cloud Native Computing Foundation.

Key Concepts:

1. Pods: The smallest deployable units in Kubernetes. A pod represents a single instance of a running process in your cluster.

2. Services: An abstract way to expose an application running on a set of Pods as a network service.

3. Deployments: Provide declarative updates for Pods and ReplicaSets.

Best Practices:

Always use specific image tags, not "latest". This ensures reproducible deployments.`
    };

    const result = await analyzeSpellingGrammarDocumentParallel(
      cleanDoc,
      grammarAgent,
      20,
      3
    );

    console.log(`\n=== Clean Document Test ===`);
    console.log(`Errors found: ${result.highlights.length}`);
    
    expect(result.highlights.length).toBeLessThan(3); // Should find very few or no errors
    expect(result.grade).toBeGreaterThanOrEqual(95);
    expect(result.summary).toMatch(/no spelling|0 spelling|few/i);
  }, TIMEOUT);
});