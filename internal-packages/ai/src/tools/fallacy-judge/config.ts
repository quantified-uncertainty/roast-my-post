import type { ToolConfig } from '../base/Tool';

export const fallacyJudgeConfig: ToolConfig = {
  id: 'fallacy-judge',
  name: 'Fallacy Judge Aggregator',
  description:
    'Aggregates fallacy issues from multiple extractors, merging duplicates and filtering weak single-source issues with explainable decisions',
  version: '1.0.0',
  category: 'utility',
  path: '/tools/fallacy-judge',
  status: 'beta',
};
