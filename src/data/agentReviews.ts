import type { EvaluationAgentReview } from "@/types/oldEvaluationAgentReview";

export const agentReviews: EvaluationAgentReview[] = [
  {
    evaluatedAgentId: "ea-impact-evaluator",
    grade: 60,
    summary:
      "Basic. Provides a simple EA lense. Ranks all EA work highly, so not good for diserning between good and bad EA work. More useful for flagging EA vs non-EA work.",
    author: "Ozzie Gooen",
    createdAt: new Date("2024-04-17T00:00:00.000Z"),
  },
  {
    evaluatedAgentId: "clarity-coach",
    grade: 60,
    summary:
      "Basic, but sometimes useful. Scores seem to correlate with clarity. Useful for improving writing. One challenge is that it doesn't account for the specific audience of the writing, so it's biased towards a general audience. For example, a niche article aimed at a math audience would get poor scores, but is still clear and useful.",
    author: "Ozzie Gooen",
    createdAt: new Date("2024-04-17T00:00:00.000Z"),
  },
  {
    evaluatedAgentId: "bias-detector",
    grade: 40,
    summary:
      "Finds knwon philosophical biases in text. But I'm not sure how useful this actually is, instead of acting as an academic exercise. Often very negative, and I often disagree with the criticality of the biases mentioned. That said, some articles do well on this, and those articles do seem to be less biased.",
    author: "Ozzie Gooen",
    createdAt: new Date("2024-04-17T00:00:00.000Z"),
  },
  {
    evaluatedAgentId: "fake-eliezer",
    grade: 40,
    summary:
      "Amusing, but basic. Highly ideological on AI safety, so its rankings are high or low based on the AI safety stance of the author. Might be useful for people lighly familiar with Eliezer Yudkowsky's work, but not much else.",
    author: "Ozzie Gooen",
    createdAt: new Date("2024-04-17T00:00:00.000Z"),
  },
  {
    evaluatedAgentId: "quantitative-forecaster",
    grade: 55,
    summary: "Sometimes interesting. Light recommendations are provided.",
    author: "Ozzie Gooen",
    createdAt: new Date("2024-04-17T00:00:00.000Z"),
  },
  {
    evaluatedAgentId: "research-scholar",
    grade: 30,
    summary:
      "One of the worst as of now. Meant to link to specific external sources, but rarely actually does this.",
    author: "Ozzie Gooen",
    createdAt: new Date("2024-04-17T00:00:00.000Z"),
  },
];
