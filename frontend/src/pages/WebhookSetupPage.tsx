import React, { useState, useEffect } from 'react';
import { Key, Copy, Trash2, XCircle, CheckCircle, RefreshCw, FileText, Code, AlertCircle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface ApiKey {
  id: number;
  api_key: string;
  is_active: number;
  last_used_at: string | null;
  created_at: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081/api';

export const WebhookSetupPage: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const response = await api.get('/webhook-keys/');
      setApiKeys(response.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      await api.post('/webhook-keys/generate');
      toast.success('API key generated successfully');
      fetchApiKeys();
    } catch (error) {
      toast.error('Failed to generate API key');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeactivate = async (keyId: number) => {
    try {
      await api.put(`/webhook-keys/${keyId}/deactivate`);
      toast.success('API key deactivated');
      fetchApiKeys();
    } catch (error) {
      toast.error('Failed to deactivate API key');
    }
  };

  const handleDelete = async (keyId: number) => {
    if (!window.confirm('Are you sure you want to permanently delete this API key?')) return;
    try {
      await api.delete(`/webhook-keys/${keyId}`);
      toast.success('API key deleted');
      fetchApiKeys();
    } catch (error) {
      toast.error('Failed to delete API key');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied to clipboard`);
    }).catch(() => {
      toast.error('Failed to copy');
    });
  };

  const activeKey = apiKeys.find(k => k.is_active === 1);
  const webhookUrl = `${API_URL}/webhook/google-form`;

  const appsScriptCode = `// Google Apps Script - Auto-send form responses to Hostel Management System
// Paste this in your Google Form's Script Editor (Extensions > Apps Script)

const WEBHOOK_URL = "${webhookUrl}";
const API_KEY = "${activeKey?.api_key || 'YOUR_API_KEY_HERE'}";

function onFormSubmit(e) {
  const response = e.response;
  const items = response.getItemResponses();

  const data = {};
  const fieldMap = {
    "First Name": "first_name",
    "Last Name": "last_name",
    "Gender": "gender",
    "Phone Number": "phone",
    "Email": "email",
    "Date of Birth": "date_of_birth",
    "Guardian Name": "guardian_name",
    "Guardian Phone": "guardian_phone",
    "Guardian Relation": "guardian_relation",
    "Permanent Address": "permanent_address",
    "Working Address": "present_working_address",
    "ID Proof Type": "id_proof_type",
    "ID Proof Number": "id_proof_number",
    "Room Number": "room_number"
  };

  for (const item of items) {
    const title = item.getItem().getTitle();
    const value = item.getResponse();
    if (fieldMap[title]) {
      data[fieldMap[title]] = value;
    }
  }

  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "X-API-Key": API_KEY
    },
    payload: JSON.stringify(data),
    muteHttpExceptions: true
  };

  try {
    const result = UrlFetchApp.fetch(WEBHOOK_URL, options);
    Logger.log("Webhook response: " + result.getContentText());
  } catch (error) {
    Logger.log("Webhook error: " + error.toString());
  }
}

// Run this function ONCE to set up the form submit trigger
function setupTrigger() {
  const form = FormApp.getActiveForm();
  ScriptApp.newTrigger("onFormSubmit")
    .forForm(form)
    .onFormSubmit()
    .create();
  Logger.log("Trigger created successfully!");
}`;

  const formFields = [
    { num: 1, title: 'First Name', type: 'Short answer', required: true },
    { num: 2, title: 'Last Name', type: 'Short answer', required: false },
    { num: 3, title: 'Gender', type: 'Dropdown (Male / Female / Other)', required: true },
    { num: 4, title: 'Phone Number', type: 'Short answer', required: true },
    { num: 5, title: 'Email', type: 'Short answer', required: false },
    { num: 6, title: 'Date of Birth', type: 'Date', required: false },
    { num: 7, title: 'Guardian Name', type: 'Short answer', required: false },
    { num: 8, title: 'Guardian Phone', type: 'Short answer', required: true },
    { num: 9, title: 'Guardian Relation', type: 'Dropdown (Father / Mother / Brother / Sister / Uncle / Aunt / Other)', required: false },
    { num: 10, title: 'Permanent Address', type: 'Paragraph', required: false },
    { num: 11, title: 'Working Address', type: 'Paragraph', required: false },
    { num: 12, title: 'ID Proof Type', type: 'Dropdown (Aadhar Card / PAN Card / Voter ID / Driving License / Passport)', required: false },
    { num: 13, title: 'ID Proof Number', type: 'Short answer', required: false },
    { num: 14, title: 'Room Number', type: 'Short answer', required: false },
  ];

  return (
    <div className="space-y-6">
      {/* Section 1: API Key Management */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">API Key Management</h2>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            {generating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Key className="h-4 w-4" />
            )}
            {generating ? 'Generating...' : 'Generate New Key'}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Key className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No API keys yet. Generate one to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border ${
                  key.is_active
                    ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                    : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
                }`}
              >
                <div className="flex-1 min-w-0 mb-2 sm:mb-0">
                  <div className="flex items-center gap-2 mb-1">
                    {key.is_active ? (
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    )}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      key.is_active
                        ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {key.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <code className="text-xs text-gray-600 dark:text-gray-300 break-all font-mono">
                    {key.api_key}
                  </code>
                  <div className="text-xs text-gray-400 mt-1">
                    Created: {new Date(key.created_at).toLocaleDateString()}
                    {key.last_used_at && ` | Last used: ${new Date(key.last_used_at).toLocaleDateString()}`}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => copyToClipboard(key.api_key, 'API key')}
                    className="p-2 text-gray-500 hover:text-primary-600 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Copy key"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  {key.is_active ? (
                    <button
                      onClick={() => handleDeactivate(key.id)}
                      className="p-2 text-gray-500 hover:text-orange-600 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Deactivate key"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  ) : null}
                  <button
                    onClick={() => handleDelete(key.id)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Delete key"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Setup Instructions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Setup Instructions</h2>
        </div>

        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'var(--primary-color)', color: 'white', opacity: 0.9 }}>1</span>
            <div>
              <p className="font-medium">Generate an API Key</p>
              <p className="text-gray-500 dark:text-gray-400">Click "Generate New Key" above. Copy and keep it safe.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'var(--primary-color)', color: 'white', opacity: 0.9 }}>2</span>
            <div>
              <p className="font-medium">Create a Google Form</p>
              <p className="text-gray-500 dark:text-gray-400">
                Go to <a href="https://forms.google.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">forms.google.com</a> and create a new form.
                Add the fields listed in the table below. The question titles must match <strong>exactly</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'var(--primary-color)', color: 'white', opacity: 0.9 }}>3</span>
            <div>
              <p className="font-medium">Add the Apps Script</p>
              <p className="text-gray-500 dark:text-gray-400">
                In the Google Form editor, go to <strong>Extensions &gt; Apps Script</strong>.
                Delete any existing code and paste the script from the section below.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'var(--primary-color)', color: 'white', opacity: 0.9 }}>4</span>
            <div>
              <p className="font-medium">Run the Setup Function</p>
              <p className="text-gray-500 dark:text-gray-400">
                In the Apps Script editor, select the <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">setupTrigger</code> function from the dropdown and click <strong>Run</strong>.
                Grant the required permissions when prompted. This creates a trigger that fires on every form submission.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'var(--primary-color)', color: 'white', opacity: 0.9 }}>5</span>
            <div>
              <p className="font-medium">Share the Form</p>
              <p className="text-gray-500 dark:text-gray-400">
                Share the Google Form link with students. When they submit the form, students are automatically registered in the system.
              </p>
            </div>
          </div>
        </div>

        {/* Form Fields Table */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Google Form Question Titles (must match exactly)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  <th className="border border-gray-200 dark:border-gray-600 px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">#</th>
                  <th className="border border-gray-200 dark:border-gray-600 px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Question Title</th>
                  <th className="border border-gray-200 dark:border-gray-600 px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Type</th>
                  <th className="border border-gray-200 dark:border-gray-600 px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Required</th>
                </tr>
              </thead>
              <tbody>
                {formFields.map((field) => (
                  <tr key={field.num} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="border border-gray-200 dark:border-gray-600 px-3 py-2 text-gray-600 dark:text-gray-400">{field.num}</td>
                    <td className="border border-gray-200 dark:border-gray-600 px-3 py-2 font-mono text-xs text-gray-900 dark:text-white">{field.title}</td>
                    <td className="border border-gray-200 dark:border-gray-600 px-3 py-2 text-gray-600 dark:text-gray-400">{field.type}</td>
                    <td className="border border-gray-200 dark:border-gray-600 px-3 py-2">
                      {field.required ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Yes</span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Section 3: Google Apps Script */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Google Apps Script</h2>
          </div>
          <button
            onClick={() => copyToClipboard(appsScriptCode, 'Apps Script code')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <Copy className="h-4 w-4" />
            Copy Script
          </button>
        </div>

        {!activeKey && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg text-sm text-orange-700 dark:text-orange-300">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p>Generate an active API key first. The script below will be auto-filled with your key.</p>
          </div>
        )}

        <div className="relative">
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs leading-relaxed font-mono">
            <code>{appsScriptCode}</code>
          </pre>
        </div>

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-300">
          <p className="font-medium mb-1">Webhook URL:</p>
          <div className="flex items-center gap-2">
            <code className="text-xs break-all font-mono bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded flex-1">{webhookUrl}</code>
            <button
              onClick={() => copyToClipboard(webhookUrl, 'Webhook URL')}
              className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors flex-shrink-0"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
