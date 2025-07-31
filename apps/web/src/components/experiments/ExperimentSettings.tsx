"use client";

interface ExperimentSettings {
  trackingId: string;
  description: string;
  expiresInDays: number;
}

interface ExperimentSettingsProps {
  settings: ExperimentSettings;
  onChange: (settings: ExperimentSettings) => void;
}

export function ExperimentSettingsForm({ settings, onChange }: ExperimentSettingsProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Experiment Settings</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tracking ID <span className="text-xs text-gray-500">(optional)</span>
          </label>
          <input
            type="text"
            value={settings.trackingId}
            onChange={(e) => onChange({ ...settings, trackingId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            placeholder="exp_technical_v1 (auto-generated if empty)"
          />
          <p className="mt-1 text-xs text-gray-500">
            A unique identifier for tracking this experiment. Will be auto-generated if left empty.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-xs text-gray-500">(optional)</span>
          </label>
          <input
            type="text"
            value={settings.description}
            onChange={(e) => onChange({ ...settings, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            placeholder="Testing stricter technical accuracy criteria"
          />
          <p className="mt-1 text-xs text-gray-500">
            Brief description of what you're testing in this experiment.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Auto-delete after (days) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={settings.expiresInDays}
            onChange={(e) => onChange({ ...settings, expiresInDays: parseInt(e.target.value) || 7 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            min="1"
            max="90"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            Experiment and all associated data will be automatically deleted after this many days (1-90).
          </p>
        </div>

        <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Ephemeral experiments are automatically deleted after expiration. 
            Make sure to export any results you want to keep before the expiration date.
          </p>
        </div>
      </div>
    </div>
  );
}