import { PluginType } from "../types";
import { createPluginBasedAgent } from "../utils/createPluginBasedAgent";

export const forecastCheckerAgent = createPluginBasedAgent({
  id: "system-forecast-checker",
  name: "Forecast Check",
  description: "Makes forecasts on binary questions in the document.",
  pluginIds: [PluginType.FORECAST],
  readmeId: "forecast-checker",
  isRecommended: true,
  isLlmCostTracked: true,
});
