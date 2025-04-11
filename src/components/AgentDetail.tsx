"use client";

import { EvaluationAgent } from "@/types/evaluationAgents";
import { getIcon } from "@/utils/iconMap";

interface AgentDetailProps {
  agent: EvaluationAgent;
}

export default function AgentDetail({ agent }: AgentDetailProps) {
  const IconComponent = getIcon(agent.iconName);
  
  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className={`p-3 rounded-lg ${agent.color}`}>
          <IconComponent className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{agent.name}</h1>
          <p className="text-gray-500">Version {agent.version}</p>
        </div>
      </div>
      
      <div className="mb-8">
        <p className="text-lg text-gray-700">{agent.description}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Capabilities</h2>
          <ul className="space-y-2">
            {agent.capabilities.map((capability, index) => (
              <li key={index} className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>{capability}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Use Cases</h2>
          <ul className="space-y-2">
            {agent.use_cases.map((useCase, index) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span>{useCase}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Limitations</h2>
          <ul className="space-y-2">
            {agent.limitations.map((limitation, index) => (
              <li key={index} className="flex items-start">
                <span className="text-amber-500 mr-2">!</span>
                <span>{limitation}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <div className="mt-12 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">How to Use</h2>
        <p className="mb-4">
          To use the {agent.name} for document evaluation, follow these steps:
        </p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Upload or select the document you want to evaluate</li>
          <li>Select "{agent.name}" from the evaluation agents list</li>
          <li>Configure any specific parameters for the evaluation (if applicable)</li>
          <li>Review the agent's feedback and annotations on your document</li>
          <li>Apply suggested changes or export the evaluation report</li>
        </ol>
      </div>
    </div>
  );
}