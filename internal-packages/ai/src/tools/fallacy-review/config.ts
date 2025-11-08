import type { ToolConfig } from "../base/Tool";

export const fallacyReviewConfig: ToolConfig = {
  id: "fallacy-review",
  name: "Fallacy Review",
  description:
    "Reviews and filters epistemic critic comments, removing redundant issues and generating comprehensive document summaries",
  version: "1.0.0",
  category: "utility",
  path: "/tools/fallacy-review",
  status: "beta",
};
