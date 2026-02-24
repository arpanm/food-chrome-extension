import React, { useState, useEffect } from "react";
import type { Config } from "../../shared/types";
import { DEFAULT_MODEL } from "../../shared/constants";

interface Props {
  onClose: () => void;
  onSave: (config: Config) => void;
  initialConfig: Config;
}

const CLAUDE_MODELS = [
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4 (May 2025)" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { id: "claude-opus-4-6", label: "Claude Opus 4.6" },
  { id: "claude-opus-4-20250514", label: "Claude Opus 4 (May 2025)" },
  { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
  { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
];

const DEFAULT_CONFIG: Config = {
  apiKey: "",
  backendUrl: "",
  model: DEFAULT_MODEL,
};

export default function SettingsPanel({ onClose, onSave, initialConfig }: Props) {
  const [apiKey, setApiKey] = useState(initialConfig.apiKey);
  const [backendUrl, setBackendUrl] = useState(initialConfig.backendUrl);
  const [model, setModel] = useState(initialConfig.model);

  useEffect(() => {
    setApiKey(initialConfig.apiKey);
    setBackendUrl(initialConfig.backendUrl);
    setModel(initialConfig.model);
  }, [initialConfig]);

  const handleSave = () => {
    onSave({
      apiKey: apiKey.trim(),
      backendUrl: backendUrl.trim(),
      model: model.trim() || DEFAULT_MODEL,
    });
    onClose();
  };

  return (
    <div className="absolute inset-0 z-10 bg-white flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Settings</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 p-1 rounded"
        >
          Close
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Anthropic API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <p className="mt-1 text-xs text-gray-500">
            Used when no backend URL is set. Stored locally only.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Backend URL (optional)
          </label>
          <input
            type="url"
            value={backendUrl}
            onChange={(e) => setBackendUrl(e.target.value)}
            placeholder="http://localhost:3000"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <p className="mt-1 text-xs text-gray-500">
            If set, API calls go through your server instead of directly to Anthropic.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Model
          </label>
          <select
            value={CLAUDE_MODELS.some((m) => m.id === model) ? model : DEFAULT_MODEL}
            onChange={(e) => setModel(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
          >
            {CLAUDE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="p-4 border-t border-gray-200">
        <button
          type="button"
          onClick={handleSave}
          className="w-full rounded-xl bg-orange-500 py-2.5 text-sm font-medium text-white hover:bg-orange-600"
        >
          Save
        </button>
      </div>
    </div>
  );
}
