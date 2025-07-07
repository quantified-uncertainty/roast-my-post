'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRightIcon, BeakerIcon, DocumentIcon, CogIcon } from '@heroicons/react/24/outline';

interface AgentConfig {
  name: string;
  primaryInstructions: string;
  selfCritiqueInstructions?: string;
  providesGrades: boolean;
  description?: string;
}

interface DocumentSelection {
  mode: 'search' | 'urls' | 'inline';
  documentIds: string[];
  urls: string[];
  inlineDocuments: Array<{
    title: string;
    content: string;
    author?: string;
  }>;
}

export default function NewExperimentPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'form' | 'yaml'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Agent configuration
  const [agentConfig, setAgentConfig] = useState<AgentConfig>({
    name: '',
    primaryInstructions: '',
    selfCritiqueInstructions: '',
    providesGrades: false,
    description: '',
  });
  
  // Experiment settings
  const [experimentSettings, setExperimentSettings] = useState({
    trackingId: '',
    description: '',
    expiresInDays: 7,
  });
  
  // Document selection
  const [documentSelection, setDocumentSelection] = useState<DocumentSelection>({
    mode: 'search',
    documentIds: [],
    urls: [],
    inlineDocuments: [],
  });
  
  // YAML representation of agent config
  const agentConfigYaml = `name: ${agentConfig.name || 'Untitled Agent'}
description: ${agentConfig.description || ''}
providesGrades: ${agentConfig.providesGrades}

primaryInstructions: |
  ${agentConfig.primaryInstructions.split('\n').map(line => '  ' + line).join('\n')}

selfCritiqueInstructions: |
  ${agentConfig.selfCritiqueInstructions?.split('\n').map(line => '  ' + line).join('\n')}`;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Build request body
      const body: any = {
        isEphemeral: true,
        trackingId: experimentSettings.trackingId || undefined,
        description: experimentSettings.description || undefined,
        expiresInDays: experimentSettings.expiresInDays,
        ephemeralAgent: agentConfig,
      };
      
      // Add documents based on selection mode
      if (documentSelection.mode === 'search' && documentSelection.documentIds.length > 0) {
        body.documentIds = documentSelection.documentIds;
      } else if (documentSelection.mode === 'urls' && documentSelection.urls.length > 0) {
        body.ephemeralDocuments = { urls: documentSelection.urls };
      } else if (documentSelection.mode === 'inline' && documentSelection.inlineDocuments.length > 0) {
        body.ephemeralDocuments = { inline: documentSelection.inlineDocuments };
      }
      
      const response = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create experiment');
      }
      
      const data = await response.json();
      
      // Redirect to experiment page
      router.push(`/experiments/${data.batch.trackingId}`);
    } catch (error) {
      console.error('Error creating experiment:', error);
      alert('Failed to create experiment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <BeakerIcon className="h-8 w-8 mr-3 text-purple-600" />
            New Experiment
          </h1>
          <p className="mt-2 text-gray-600">
            Create a temporary agent and test it on selected documents
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left side - Agent Builder */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <CogIcon className="h-5 w-5 mr-2 text-gray-600" />
              Agent Configuration
            </h2>
            
            {/* Form/YAML Tabs */}
            <div className="border-b border-gray-200 mb-4">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('form')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'form'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Form
                </button>
                <button
                  onClick={() => setActiveTab('yaml')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'yaml'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  YAML
                </button>
              </nav>
            </div>

            {activeTab === 'form' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agent Name
                  </label>
                  <input
                    type="text"
                    value={agentConfig.name}
                    onChange={(e) => setAgentConfig({ ...agentConfig, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="e.g., Technical Reviewer v1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={agentConfig.description}
                    onChange={(e) => setAgentConfig({ ...agentConfig, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Brief description of the agent's purpose"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Instructions
                  </label>
                  <textarea
                    value={agentConfig.primaryInstructions}
                    onChange={(e) => setAgentConfig({ ...agentConfig, primaryInstructions: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    rows={6}
                    placeholder="Instructions for how the agent should evaluate documents..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Self-Critique Instructions
                  </label>
                  <textarea
                    value={agentConfig.selfCritiqueInstructions}
                    onChange={(e) => setAgentConfig({ ...agentConfig, selfCritiqueInstructions: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    rows={4}
                    placeholder="Instructions for self-critique phase..."
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="providesGrades"
                    checked={agentConfig.providesGrades}
                    onChange={(e) => setAgentConfig({ ...agentConfig, providesGrades: e.target.checked })}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="providesGrades" className="ml-2 text-sm text-gray-700">
                    Agent provides numerical grades
                  </label>
                </div>
              </div>
            ) : (
              <div>
                <textarea
                  value={agentConfigYaml}
                  onChange={(e) => {
                    // TODO: Parse YAML and update agentConfig
                    console.log('YAML editing not yet implemented');
                  }}
                  className="w-full h-96 px-3 py-2 font-mono text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                />
                <p className="mt-2 text-sm text-gray-500">
                  YAML editing coming soon. Use the form tab for now.
                </p>
              </div>
            )}
          </div>

          {/* Right side - Experiment Settings & Document Selection */}
          <div className="space-y-6">
            {/* Experiment Settings */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Experiment Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tracking ID
                  </label>
                  <input
                    type="text"
                    value={experimentSettings.trackingId}
                    onChange={(e) => setExperimentSettings({ ...experimentSettings, trackingId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="exp_technical_v1 (auto-generated if empty)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={experimentSettings.description}
                    onChange={(e) => setExperimentSettings({ ...experimentSettings, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Testing stricter technical accuracy criteria"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Auto-delete after (days)
                  </label>
                  <input
                    type="number"
                    value={experimentSettings.expiresInDays}
                    onChange={(e) => setExperimentSettings({ ...experimentSettings, expiresInDays: parseInt(e.target.value) || 7 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    min="1"
                    max="90"
                  />
                </div>
              </div>
            </div>

            {/* Document Selection */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <DocumentIcon className="h-5 w-5 mr-2 text-gray-600" />
                Document Selection
              </h2>

              {/* Document Mode Tabs */}
              <div className="border-b border-gray-200 mb-4">
                <nav className="-mb-px flex space-x-4">
                  <button
                    onClick={() => setDocumentSelection({ ...documentSelection, mode: 'search' })}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      documentSelection.mode === 'search'
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Search Existing
                  </button>
                  <button
                    onClick={() => setDocumentSelection({ ...documentSelection, mode: 'urls' })}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      documentSelection.mode === 'urls'
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Import URLs
                  </button>
                  <button
                    onClick={() => setDocumentSelection({ ...documentSelection, mode: 'inline' })}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      documentSelection.mode === 'inline'
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Paste Content
                  </button>
                </nav>
              </div>

              {/* Document Selection Content */}
              {documentSelection.mode === 'search' && (
                <div>
                  <input
                    type="text"
                    placeholder="Search documents..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Document search UI to be implemented
                  </p>
                  <div className="mt-2 text-sm text-gray-600">
                    Selected: {documentSelection.documentIds.length} documents
                  </div>
                </div>
              )}

              {documentSelection.mode === 'urls' && (
                <div>
                  <textarea
                    placeholder="Enter URLs, one per line..."
                    className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    onChange={(e) => setDocumentSelection({
                      ...documentSelection,
                      urls: e.target.value.split('\n').filter(url => url.trim()),
                    })}
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Supported: LessWrong, EA Forum, general web pages
                  </p>
                </div>
              )}

              {documentSelection.mode === 'inline' && (
                <div className="space-y-4">
                  <button
                    onClick={() => {
                      setDocumentSelection({
                        ...documentSelection,
                        inlineDocuments: [
                          ...documentSelection.inlineDocuments,
                          { title: '', content: '', author: '' },
                        ],
                      });
                    }}
                    className="text-sm text-purple-600 hover:text-purple-700"
                  >
                    + Add Document
                  </button>
                  {documentSelection.inlineDocuments.map((doc, index) => (
                    <div key={index} className="border border-gray-200 rounded p-3 space-y-2">
                      <input
                        type="text"
                        placeholder="Document title"
                        value={doc.title}
                        onChange={(e) => {
                          const updated = [...documentSelection.inlineDocuments];
                          updated[index].title = e.target.value;
                          setDocumentSelection({ ...documentSelection, inlineDocuments: updated });
                        }}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                      <textarea
                        placeholder="Document content..."
                        value={doc.content}
                        onChange={(e) => {
                          const updated = [...documentSelection.inlineDocuments];
                          updated[index].content = e.target.value;
                          setDocumentSelection({ ...documentSelection, inlineDocuments: updated });
                        }}
                        className="w-full h-20 px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !agentConfig.name || !agentConfig.primaryInstructions}
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-md font-medium hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                'Creating Experiment...'
              ) : (
                <>
                  Create Experiment
                  <ChevronRightIcon className="h-5 w-5 ml-2" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}