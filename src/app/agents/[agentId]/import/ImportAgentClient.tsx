"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, Loader2 } from "lucide-react";

import { Button } from "@/components/Button";

interface ImportAgentClientProps {
  agentId: string;
}

interface ConversionResult {
  success: boolean;
  data?: {
    name: string;
    description: string;
    genericInstructions?: string;
    summaryInstructions?: string;
    commentInstructions?: string;
    gradeInstructions?: string;
    extendedCapabilityId?: string;
  };
  message: string;
  changes: string[];
}

export function ImportAgentClient({ agentId }: ImportAgentClientProps) {
  const router = useRouter();
  const [importText, setImportText] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);

  const handleImport = async () => {
    if (!importText.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/agents/${agentId}/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: importText }),
      });

      const result = await response.json();
      setConversionResult(result);
    } catch (error) {
      console.error('Import error:', error);
      setConversionResult({
        success: false,
        message: 'Failed to process import. Please try again.',
        changes: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToEdit = () => {
    if (conversionResult?.success && conversionResult.data) {
      // Store the imported data in sessionStorage to pass to edit page
      sessionStorage.setItem(`importedAgentData_${agentId}`, JSON.stringify(conversionResult.data));
      router.push(`/agents/${agentId}/edit?import=true`);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/agents/${agentId}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Agent
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Import Agent Configuration</h1>
        <p className="mt-2 text-gray-600">
          Paste any format below - Markdown, JSON, plain text, or anything else. 
          Our AI will intelligently parse it and convert it to the proper agent format.
        </p>
      </div>

      {/* Import Form */}
      <div className="space-y-6">
        <div>
          <label htmlFor="import-text" className="block text-sm font-medium text-gray-700 mb-2">
            Import Content
          </label>
          <textarea
            id="import-text"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Paste your agent configuration here in any format - Markdown with frontmatter, JSON, plain text instructions, or anything else..."
            className="w-full h-96 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
            disabled={loading}
          />
        </div>

        <div className="flex items-center gap-4">
          <Button 
            onClick={handleImport} 
            disabled={!importText.trim() || loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {loading ? 'Processing...' : 'Process Import'}
          </Button>
          
          <Link href={`/agents/${agentId}`}>
            <Button variant="secondary">Cancel</Button>
          </Link>
        </div>

        {/* Conversion Result */}
        {conversionResult && (
          <div className={`rounded-lg border p-6 ${
            conversionResult.success 
              ? 'border-green-200 bg-green-50' 
              : 'border-red-200 bg-red-50'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className={`text-lg font-medium ${
                  conversionResult.success ? 'text-green-900' : 'text-red-900'
                }`}>
                  {conversionResult.success ? 'Conversion Successful!' : 'Conversion Failed'}
                </h3>
                
                <p className={`mt-2 text-sm ${
                  conversionResult.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {conversionResult.message}
                </p>

                {conversionResult.changes.length > 0 && (
                  <div className="mt-4">
                    <h4 className={`text-sm font-medium ${
                      conversionResult.success ? 'text-green-900' : 'text-red-900'
                    }`}>
                      Changes Made:
                    </h4>
                    <ul className={`mt-2 text-sm ${
                      conversionResult.success ? 'text-green-700' : 'text-red-700'
                    } list-disc list-inside space-y-1`}>
                      {conversionResult.changes.map((change, index) => (
                        <li key={index}>{change}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {conversionResult.success && (
              <div className="mt-6 flex items-center gap-4">
                <Button onClick={handleProceedToEdit} className="flex items-center gap-2">
                  Continue to Edit Form
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => setConversionResult(null)}
                >
                  Try Different Input
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}