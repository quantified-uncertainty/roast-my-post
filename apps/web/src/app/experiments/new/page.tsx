'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRightIcon, BeakerIcon } from '@heroicons/react/24/outline';
import { AgentConfigForm } from '@/components/experiments/AgentConfigForm';
import { ExperimentSettingsForm } from '@/components/experiments/ExperimentSettings';
import { DocumentSelectionForm } from '@/components/experiments/DocumentSelection';

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

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Build request body
      const body: Record<string, unknown> = {
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
      const message = error instanceof Error ? error.message : 'Failed to create experiment';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if form is valid
  const isFormValid = 
    agentConfig.name && 
    agentConfig.primaryInstructions &&
    (
      (documentSelection.mode === 'search' && documentSelection.documentIds.length > 0) ||
      (documentSelection.mode === 'urls' && documentSelection.urls.length > 0) ||
      (documentSelection.mode === 'inline' && documentSelection.inlineDocuments.length > 0 && 
        documentSelection.inlineDocuments.every(doc => doc.title && doc.content))
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 py-8">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <BeakerIcon className="h-8 w-8 mr-3 text-purple-600" />
            New Experiment
          </h1>
          <p className="mt-2 text-gray-600">
            Create a temporary evaluator and test it on selected documents. All data will be automatically
            deleted after the expiration period.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-16rem)]">
          {/* Left side - Agent Builder (2/3 width) */}
          <div className="lg:col-span-2 min-h-0">
            <AgentConfigForm 
              config={agentConfig} 
              onChange={setAgentConfig}
            />
          </div>

          {/* Right side - Experiment Settings & Document Selection (1/3 width) */}
          <div className="space-y-6 overflow-auto">
            <ExperimentSettingsForm
              settings={experimentSettings}
              onChange={setExperimentSettings}
            />

            <DocumentSelectionForm
              selection={documentSelection}
              onChange={setDocumentSelection}
            />

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !isFormValid}
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-md font-medium hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
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
            
            {!isFormValid && (
              <p className="text-sm text-gray-500 text-center">
                Please fill in all required fields and select at least one document
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}