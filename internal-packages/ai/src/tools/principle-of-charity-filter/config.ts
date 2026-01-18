/**
 * Configuration for principle-of-charity filter tool
 */

import type { ToolConfig } from "../base/Tool";

export const principleOfCharityFilterConfig: ToolConfig = {
  id: "principle-of-charity-filter",
  name: "Principle of Charity Filter",
  description: "Filters issues that dissolve when applying charitable interpretation",
  version: "1.0.0",
  category: "utility",
};
