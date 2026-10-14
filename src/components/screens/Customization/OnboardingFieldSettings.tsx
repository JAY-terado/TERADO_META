import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Layers,
  Sparkles,
  Lock,
  Search,
  ArrowRight,
  ExternalLink,
  Code2,
  Copy,
  Check,
  Globe,
  Settings2,
} from 'lucide-react';
import Swal from 'sweetalert2';
import {
  OnboardingFieldSetting,
  SEEDED_BROKER_FIELDS,
  getCsrfToken,
  getPublicOnboardingFields,
  upsertOnboardingFieldSettings,
  getFieldDisplayName,
  getActiveApiBaseUrl,
  setActiveApiBaseUrl,
  fetchInitCsrfDetails,
} from '../../../admin/api/onboardingFields';

export const OnboardingFieldSettings: React.FC = () => {
  const [fields, setFields] = useState<OnboardingFieldSetting[]>(SEEDED_BROKER_FIELDS);
  const [originalFields, setOriginalFields] = useState<OnboardingFieldSetting[]>(SEEDED_BROKER_FIELDS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [fetchingCsrf, setFetchingCsrf] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStepFilter, setSelectedStepFilter] = useState<number | 'all'>('all');
  const [testResult, setTestResult] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'sandbox'>('editor');
  const [copiedToken, setCopiedToken] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState<string>(getActiveApiBaseUrl());
  const [showUrlConfig, setShowUrlConfig] = useState(false);

  // Load CSRF token and field settings on mount
  useEffect(() => {
    loadData(true);
  }, []);

  const loadData = async (forceTokenRefresh = true) => {
    setLoading(true);
    try {
      setFetchingCsrf(true);
      const token = await getCsrfToken(forceTokenRefresh);
      setCsrfToken(token);
      setFetchingCsrf(false);

      const res = await getPublicOnboardingFields('BROKER');
      if (res.data && res.data.length > 0) {
        setFields(res.data);
        setOriginalFields(JSON.parse(JSON.stringify(res.data)));
      }
    } catch (err: any) {
      console.error('Failed to load onboarding field settings:', err);
    } finally {
      setLoading(false);
      setFetchingCsrf(false);
    }
  };

  const handleRefreshCsrf = async () => {
    setFetchingCsrf(true);
    try {
      const details = await fetchInitCsrfDetails();
      setCsrfToken(details.csrfToken);
      Swal.fire({
        title: 'CSRF Token Generated!',
        html: `
          <div class="text-left text-xs space-y-2">
            <p><strong>Endpoint:</strong> <code class="text-blue-600 bg-blue-50 px-1 py-0.5 rounded break-all">${details.endpointUrl}</code></p>
            <p><strong>Status:</strong> <span class="text-emerald-600 font-bold">${details.status} OK</span></p>
            <p><strong>CSRF Token:</strong></p>
            <code class="block p-2 bg-slate-900 text-sky-300 rounded font-mono text-[11px] break-all">${details.csrfToken}</code>
          </div>
        `,
        icon: 'success',
        confirmButtonColor: '#1062AC',
      });
    } catch (err: any) {
      Swal.fire({
        title: 'Failed to generate CSRF token',
        text: `Error connecting to ${apiBaseUrl}/organisation-settings/public/init: ${err?.message || err}`,
        icon: 'error',
      });
    } finally {
      setFetchingCsrf(false);
    }
  };

  const handleCopyToken = () => {
    if (!csrfToken) return;
    navigator.clipboard.writeText(csrfToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleSwitchApiUrl = (newUrl: string) => {
    setActiveApiBaseUrl(newUrl);
    setApiBaseUrl(newUrl);
    Swal.fire({
      title: 'API URL Updated',
      text: `Active API Base: ${newUrl}`,
      icon: 'success',
      timer: 1500,
      showConfirmButton: false,
    });
    loadData(true);
  };

  const handleFieldChange = (id: number, key: 'step' | 'is_required', value: any) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [key]: value } : f))
    );
  };

  // Check which fields have unsaved modifications
  const modifiedFields = fields.filter((f) => {
    const orig = originalFields.find((o) => o.id === f.id);
    if (!orig) return false;
    const reqChanged = (Number(f.is_required) === 1) !== (Number(orig.is_required) === 1);
    const stepChanged = Number(f.step) !== Number(orig.step);
    return reqChanged || stepChanged;
  });

  const handleSaveAll = async () => {
    if (modifiedFields.length === 0) {
      Swal.fire({
        title: 'No Changes',
        text: 'All field configurations are currently up to date.',
        icon: 'info',
        timer: 1800,
        showConfirmButton: false,
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        settings: modifiedFields.map((f) => ({
          id: f.id,
          is_required: Number(f.is_required) === 1 ? 1 : 0,
          step: Number(f.step),
        })),
      };

      const res = await upsertOnboardingFieldSettings(payload);

      if (res.success) {
        Swal.fire({
          title: 'Settings Saved!',
          text: res.message || 'Settings updated successfully in backend.',
          icon: 'success',
          confirmButtonColor: '#1062AC',
        });
        setOriginalFields(JSON.parse(JSON.stringify(fields)));
        // Re-run the GET API (Step 1B) to see the updated values reflected
        await loadData(false);
      } else {
        Swal.fire({
          title: 'Update Failed',
          text: res.message || 'Could not update field settings.',
          icon: 'error',
        });
      }
    } catch (err: any) {
      Swal.fire({
        title: 'Error',
        text: err?.message || 'Network error while calling upsert endpoint',
        icon: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  // Step 1A: Direct Init CSRF Token API
  const runTestStep1A = async () => {
    setFetchingCsrf(true);
    try {
      const details = await fetchInitCsrfDetails();
      setCsrfToken(details.csrfToken);
      setTestResult({
        step: 'Step 1A: Get CSRF Token',
        endpoint: '/organisation-settings/public/init',
        method: 'GET',
        response: details,
        timestamp: new Date().toLocaleTimeString(),
      });
      setActiveTab('sandbox');
      Swal.fire({
        title: 'Step 1A Succeeded!',
        html: `CSRF token generated: <code class="text-xs text-blue-600 block mt-2 p-2 bg-blue-50 rounded break-all">${details.csrfToken}</code>`,
        icon: 'success',
        confirmButtonColor: '#1062AC',
      });
    } catch (err: any) {
      setTestResult({
        step: 'Step 1A: Get CSRF Token (Failed)',
        endpoint: '/organisation-settings/public/init',
        method: 'GET',
        error: err?.message || err,
        timestamp: new Date().toLocaleTimeString(),
      });
      setActiveTab('sandbox');
      Swal.fire({
        title: 'Step 1A Failed',
        text: err?.message || 'Failed to call /organisation-settings/public/init',
        icon: 'error',
      });
    } finally {
      setFetchingCsrf(false);
    }
  };

  // Step 1B: Fetch Public Onboarding Fields with x-csrf-token
  const runTestStep1B = async () => {
    setLoading(true);
    try {
      const token = await getCsrfToken(false);
      setCsrfToken(token);
      const res = await getPublicOnboardingFields('BROKER');
      if (res.data && res.data.length > 0) {
        setFields(res.data);
      }
      setTestResult({
        step: 'Step 1B: Fetch Onboarding Fields',
        endpoint: '/onboarding-field-settings/public?type=BROKER',
        method: 'GET',
        headersSent: { 'x-csrf-token': token },
        response: res,
        timestamp: new Date().toLocaleTimeString(),
      });
      setActiveTab('sandbox');
      Swal.fire({
        title: 'Step 1B Succeeded!',
        html: `Fetched <strong>${res.data?.length || 0}</strong> onboarding fields with <code class="text-xs text-blue-600 font-mono">x-csrf-token</code>`,
        icon: 'success',
        confirmButtonColor: '#1062AC',
      });
    } catch (err: any) {
      setTestResult({
        step: 'Step 1B: Fetch Onboarding Fields (Failed)',
        endpoint: '/onboarding-field-settings/public?type=BROKER',
        method: 'GET',
        error: err?.message || err,
        timestamp: new Date().toLocaleTimeString(),
      });
      setActiveTab('sandbox');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Admin Upsert API
  const runTestStep2 = async () => {
    setSaving(true);
    try {
      const samplePayload = {
        settings: [
          { id: 2, is_required: 1, step: 1 },
          { id: 6, is_required: 0, step: 2 },
        ],
      };
      const res = await upsertOnboardingFieldSettings(samplePayload);
      setTestResult({
        step: 'Step 2: Admin Upsert API Test',
        endpoint: '/onboarding-field-settings/upsert',
        method: 'POST',
        payloadSent: samplePayload,
        response: res,
        timestamp: new Date().toLocaleTimeString(),
      });
      setActiveTab('sandbox');
      Swal.fire({
        title: 'Step 2 Succeeded!',
        text: res.message || 'Settings updated successfully',
        icon: 'success',
        confirmButtonColor: '#1062AC',
      });
      // Refresh to view updated values
      await loadData(false);
    } catch (err: any) {
      setTestResult({
        step: 'Step 2: Admin Upsert API Test (Failed)',
        endpoint: '/onboarding-field-settings/upsert',
        method: 'POST',
        error: err?.message || err,
        timestamp: new Date().toLocaleTimeString(),
      });
      setActiveTab('sandbox');
    } finally {
      setSaving(false);
    }
  };

  const filteredFields = fields.filter((f) => {
    const matchesSearch =
      f.field_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getFieldDisplayName(f.field_name).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStep = selectedStepFilter === 'all' || Number(f.step) === selectedStepFilter;
    return matchesSearch && matchesStep;
  });

  return (
    <div className="space-y-6 text-left anim-fade-up">
      {/* Top Banner: CSRF Token & API Endpoint Info */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0B1528] to-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-white tracking-tight">
                CSRF Protected Onboarding Field Settings
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Live Backend Connected
              </span>
              <button
                type="button"
                onClick={() => setShowUrlConfig(!showUrlConfig)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
              >
                <Settings2 className="w-3 h-3" />
                <span>API: {apiBaseUrl}</span>
              </button>
            </div>

            {/* Configurable API URL Bar */}
            {showUrlConfig && (
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 space-y-2 anim-fade-up">
                <div className="text-[11px] text-slate-300 font-medium">Select or enter backend API URL:</div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSwitchApiUrl('http://192.168.100.5:8000/v1')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                      apiBaseUrl === 'http://192.168.100.5:8000/v1'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
                    }`}
                  >
                    192.168.100.5:8000/v1 (Live Backend)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchApiUrl('http://localhost:3004/v1')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                      apiBaseUrl === 'http://localhost:3004/v1'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
                    }`}
                  >
                    localhost:3004/v1
                  </button>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Public onboarding registration requests are verified via CSRF token (<code className="text-blue-300 bg-blue-900/40 px-1 py-0.5 rounded">x-csrf-token</code>). 
              Field requirements and steps are updated through the authenticated Admin Upsert API.
            </p>

            {/* Token display with copy and refresh */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">CSRF Token:</span>
              <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700/80 px-2.5 py-1 rounded-lg">
                <code className="text-sky-300 font-mono text-[10px] select-all max-w-[240px] sm:max-w-md truncate">
                  {csrfToken || (fetchingCsrf ? 'Generating token...' : 'No token')}
                </code>
                {csrfToken && (
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    className="p-1 hover:text-white text-slate-400 transition cursor-pointer"
                    title="Copy CSRF Token"
                  >
                    {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={handleRefreshCsrf}
                disabled={fetchingCsrf}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 hover:text-white transition cursor-pointer text-[11px] font-semibold"
              >
                <RefreshCw className={`w-3 h-3 ${fetchingCsrf ? 'animate-spin' : ''}`} />
                <span>Generate CSRF Token</span>
              </button>
            </div>
          </div>

          {/* Quick API Test Triggers */}
          <div className="flex flex-col gap-2 shrink-0">
            <button
              type="button"
              onClick={runTestStep1A}
              disabled={fetchingCsrf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition cursor-pointer"
              title="Test Step 1A: GET /organisation-settings/public/init"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Step 1A: Get CSRF Token</span>
            </button>
            <button
              type="button"
              onClick={runTestStep1B}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition cursor-pointer"
              title="Test Step 1B: GET /onboarding-field-settings/public?type=BROKER"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Step 1B: Fetch Fields (with CSRF)</span>
            </button>
            <button
              type="button"
              onClick={runTestStep2}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
              title="Test Step 2: POST /onboarding-field-settings/upsert sample"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Step 2: Admin Upsert API</span>
            </button>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2">
          {/* Step Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setSelectedStepFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedStepFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All (13)
            </button>
            <button
              onClick={() => setSelectedStepFilter(1)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedStepFilter === 1
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Step 1: Basic
            </button>
            <button
              onClick={() => setSelectedStepFilter(2)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedStepFilter === 2
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Step 2: Docs
            </button>
            <button
              onClick={() => setSelectedStepFilter(3)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedStepFilter === 3
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Step 3: Address
            </button>
          </div>

          {/* View Toggle */}
          <div className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl ml-2">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'editor'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Field Editor
            </button>
            <button
              onClick={() => setActiveTab('sandbox')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'sandbox'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              API Sandbox
            </button>
          </div>
        </div>

        {/* Search & Save Actions */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search onboarding fields..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving || modifiedFields.length === 0}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              modifiedFields.length > 0
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Save className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
            <span>Save Changes {modifiedFields.length > 0 && `(${modifiedFields.length})`}</span>
          </button>
        </div>
      </div>

      {activeTab === 'sandbox' && testResult ? (
        /* Sandbox Live Output */
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 text-white space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-blue-500/20 text-blue-400">
                <Code2 className="w-4 h-4" />
              </span>
              <h4 className="text-sm font-bold text-white">{testResult.step}</h4>
              <span className="text-xs text-slate-400 font-mono">({testResult.endpoint || 'API Output'})</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">{testResult.timestamp}</span>
          </div>

          {testResult.csrfTokenUsed && (
            <div className="text-xs bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 space-y-1">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">CSRF Header Sent:</span>
              <code className="text-sky-300 font-mono break-all block">{testResult.csrfTokenUsed}</code>
            </div>
          )}

          {testResult.payloadSent && (
            <div className="text-xs bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 space-y-1">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Payload Sent (POST Body):</span>
              <pre className="text-emerald-300 font-mono text-[11px] overflow-x-auto">
                {JSON.stringify(testResult.payloadSent, null, 2)}
              </pre>
            </div>
          )}

          <div className="space-y-1.5">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Response Received:</span>
            <pre className="bg-black/60 p-4 rounded-xl border border-slate-800 text-slate-200 font-mono text-xs overflow-x-auto max-h-96">
              {JSON.stringify(testResult.response || testResult.error, null, 2)}
            </pre>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className="text-xs text-blue-400 hover:text-blue-300 font-bold inline-flex items-center gap-1 cursor-pointer pt-2"
          >
            <span>Back to Field Editor</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        /* Fields Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFields.map((field) => {
            const isModified = modifiedFields.some((m) => m.id === field.id);
            const isReq = Number(field.is_required) === 1 || field.is_required === true;
            const displayName = getFieldDisplayName(field.field_name, field.label);

            return (
              <div
                key={field.id}
                className={`bg-white rounded-2xl p-5 border transition-all flex flex-col justify-between gap-4 shadow-xs relative ${
                  isModified
                    ? 'border-blue-400 ring-2 ring-blue-500/10'
                    : 'border-slate-200/80 hover:border-slate-300 hover:shadow-md'
                }`}
              >
                {/* Header */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                      ID #{field.id}
                    </span>
                    {isModified && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                        Pending Save
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 truncate" title={displayName}>
                    {displayName}
                  </h4>
                  <p className="text-[11px] font-mono text-slate-400 truncate">
                    {field.field_name}
                  </p>
                </div>

                {/* Configuration Controls */}
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  {/* Step Assignment */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Registration Wizard Step
                    </label>
                    <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                      {[1, 2, 3].map((stepNum) => (
                        <button
                          key={stepNum}
                          type="button"
                          onClick={() => handleFieldChange(field.id, 'step', stepNum)}
                          className={`py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                            Number(field.step) === stepNum
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Step {stepNum}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Required Flag Toggle */}
                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-800 block">Requirement</span>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        {isReq ? 'Mandatory for onboarding' : 'Optional field'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleFieldChange(field.id, 'is_required', isReq ? 0 : 1)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isReq ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          isReq ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
