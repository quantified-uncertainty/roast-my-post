import { PluginType } from "../types";
import { createPluginBasedAgent } from "../utils/createPluginBasedAgent";

export const mathCheckerAgent = createPluginBasedAgent({
  id: "system-math-checker",
  name: "Math Checker",
  description: "Verifies mathematical statements, calculations, and formulas for correctness",
  pluginIds: [PluginType.MATH],
  readmeId: "math-checker",
  isRecommended: true,
});
