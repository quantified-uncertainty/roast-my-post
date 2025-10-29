import React from 'react';
import {
  BeakerIcon,
  CalculatorIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  CloudIcon,
  DocumentMagnifyingGlassIcon,
  DocumentTextIcon,
  LanguageIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  ScaleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

// Centralized tool icon map so multiple pages can share the same visuals
export const ToolIcons: Record<string, React.ReactElement> = {
  'math-validator-llm': <CalculatorIcon className="h-8 w-8 text-blue-600" />,
  'math-validator-hybrid': <CalculatorIcon className="h-8 w-8 text-purple-600" />,
  'math-validator-mathjs': <CalculatorIcon className="h-8 w-8 text-green-600" />,
  'spelling-grammar-checker': <DocumentTextIcon className="h-8 w-8 text-red-600" />,
  'language-convention-detector': <LanguageIcon className="h-8 w-8 text-indigo-600" />,
  'document-chunker': <DocumentMagnifyingGlassIcon className="h-8 w-8 text-orange-600" />,
  'factual-claims-extractor': <ClipboardDocumentCheckIcon className="h-8 w-8 text-teal-600" />,
  'binary-forecasting-claims-extractor': <ChartBarIcon className="h-8 w-8 text-yellow-600" />,
  'math-expressions-extractor': <CalculatorIcon className="h-8 w-8 text-pink-600" />,
  'fact-checker': <ScaleIcon className="h-8 w-8 text-emerald-600" />,
  'binary-forecaster': <ChartBarIcon className="h-8 w-8 text-blue-600" />,
  'smart-text-searcher': <MagnifyingGlassIcon className="h-8 w-8 text-violet-600" />,
  'link-validator': <LinkIcon className="h-8 w-8 text-cyan-600" />,
  'perplexity-researcher': <CloudIcon className="h-8 w-8 text-slate-600" />,
  'claim-evaluator': <UserGroupIcon className="h-8 w-8 text-indigo-600" />,
};

