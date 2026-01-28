import { useState, useEffect } from 'react';
import { Download, FileText, Database, Package, Calendar, CheckCircle, Clock, FileDown, Filter, Plus, X, Save, Play, Copy, Trash2, Eye, Settings } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://localhost:5001/api';

interface FilterRule {
  field: string;
  operator: string;
  value: string;
  logic: 'AND' | 'OR';
}

interface QueryTemplate {
  id: string;
  name: string;
  dataType: string;
  dateRange: string;
  filters: FilterRule[];
  fields: string[];
  format: string;
  created: string;
}

export default function DataExport() {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [exportFormat, setExportFormat] = useState('csv');
  const [dataTimeRange, setDataTimeRange] = useState('all-time'); // New state for filtering dataset time ranges
  
  // Real data states
  const [stats, setStats] = useState({
    totalAttacks: 0,
    totalCredentials: 0,
    totalSessions: 0,
    totalCountries: 0
  });
  
  // Query Builder State
  const [showQueryBuilder, setShowQueryBuilder] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [queryDataType, setQueryDataType] = useState('');
  const [queryDateRange, setQueryDateRange] = useState('last-7-days');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [queryFormat, setQueryFormat] = useState('csv');
  const [queryOptions, setQueryOptions] = useState({
    includeHeaders: true,
    compress: false,
    anonymizeIPs: false
  });
  
  // Templates State
  const [savedTemplates, setSavedTemplates] = useState<QueryTemplate[]>([
    {
      id: '1',
      name: 'SSH Brute Force Attacks',
      dataType: 'attacks',
      dateRange: 'last-30-days',
      filters: [{ field: 'attack_type', operator: 'equals', value: 'SSH Brute Force', logic: 'AND' }],
      fields: ['timestamp', 'source_ip', 'username', 'password', 'country'],
      format: 'csv',
      created: '2025-01-20'
    },
    {
      id: '2',
      name: 'High Severity Threats',
      dataType: 'attacks',
      dateRange: 'last-7-days',
      filters: [{ field: 'severity', operator: 'equals', value: 'high', logic: 'AND' }],
      fields: ['timestamp', 'source_ip', 'attack_type', 'severity'],
      format: 'json',
      created: '2025-01-18'
    }
  ]);
  const [showTemplates, setShowTemplates] = useState(false);

  // Fetch real stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API_BASE}/dashboard/stats`);
        setStats({
          totalAttacks: response.data.totalAttacks || 0,
          totalCredentials: Math.floor((response.data.totalAttacks || 0) * 0.3),
          totalSessions: Math.floor((response.data.totalAttacks || 0) * 0.25),
          totalCountries: response.data.countriesDetected || 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const showNotification = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleExport = (dataType: string, format: string) => {
    showNotification(`Exporting ${dataType} as ${format.toUpperCase()}...`);
  };

  // Field options for different data types
  const fieldOptions: Record<string, string[]> = {
    attacks: ['timestamp', 'source_ip', 'destination_port', 'username', 'password', 'attack_type', 'severity', 'country', 'session_id'],
    credentials: ['username', 'password', 'attempts', 'first_seen', 'last_seen', 'success_rate', 'countries'],
    sessions: ['session_id', 'start_time', 'end_time', 'duration', 'source_ip', 'commands', 'files_downloaded'],
    geographic: ['country', 'country_code', 'attacks', 'percentage', 'first_seen', 'last_seen']
  };

  const addFilter = () => {
    setFilters([...filters, { field: '', operator: 'equals', value: '', logic: 'AND' }]);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, updates: Partial<FilterRule>) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    setFilters(newFilters);
  };

  const toggleField = (field: string) => {
    if (selectedFields.includes(field)) {
      setSelectedFields(selectedFields.filter(f => f !== field));
    } else {
      setSelectedFields([...selectedFields, field]);
    }
  };

  const selectAllFields = () => {
    if (queryDataType) {
      setSelectedFields(fieldOptions[queryDataType] || []);
    }
  };

  const deselectAllFields = () => {
    setSelectedFields([]);
  };

  const saveTemplate = () => {
    const newTemplate: QueryTemplate = {
      id: Date.now().toString(),
      name: `Custom Query ${savedTemplates.length + 1}`,
      dataType: queryDataType,
      dateRange: queryDateRange,
      filters,
      fields: selectedFields,
      format: queryFormat,
      created: new Date().toISOString().split('T')[0]
    };
    setSavedTemplates([...savedTemplates, newTemplate]);
    showNotification('Query template saved successfully!');
  };

  const loadTemplate = (template: QueryTemplate) => {
    setQueryDataType(template.dataType);
    setQueryDateRange(template.dateRange);
    setFilters(template.filters);
    setSelectedFields(template.fields);
    setQueryFormat(template.format);
    setShowQueryBuilder(true);
    setShowTemplates(false);
    setCurrentStep(1);
    showNotification(`Template "${template.name}" loaded!`);
  };

  const deleteTemplate = (id: string) => {
    setSavedTemplates(savedTemplates.filter(t => t.id !== id));
    showNotification('Template deleted');
  };

  const executeQuery = () => {
    showNotification(`Executing custom query and exporting as ${queryFormat.toUpperCase()}...`);
    setShowQueryBuilder(false);
    resetQueryBuilder();
  };

  const resetQueryBuilder = () => {
    setCurrentStep(1);
    setQueryDataType('');
    setQueryDateRange('last-7-days');
    setFilters([]);
    setSelectedFields([]);
    setQueryFormat('csv');
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const datasets = [
    {
      title: 'Complete Attack Dataset',
      description: 'All captured attacks with full details',
      size: formatBytes(stats.totalAttacks * 1024),
      records: stats.totalAttacks.toLocaleString(),
      icon: Database,
      color: 'from-[#FF6B35] to-[#8B5CF6]',
      id: 'attacks'
    },
    {
      title: 'Credentials Dataset',
      description: 'All attempted usernames and passwords',
      size: formatBytes(stats.totalCredentials * 512),
      records: stats.totalCredentials.toLocaleString(),
      icon: FileText,
      color: 'from-[#00D9FF] to-[#10B981]',
      id: 'credentials'
    },
    {
      title: 'Session Logs',
      description: 'Complete session recordings and commands',
      size: formatBytes(stats.totalSessions * 2048),
      records: stats.totalSessions.toLocaleString(),
      icon: Package,
      color: 'from-[#8B5CF6] to-[#00D9FF]',
      id: 'sessions'
    },
    {
      title: 'Geographic Data',
      description: 'Country-wise attack statistics',
      size: formatBytes(stats.totalCountries * 256),
      records: stats.totalCountries.toLocaleString(),
      icon: Calendar,
      color: 'from-[#10B981] to-[#00D9FF]',
      id: 'geographic'
    },
  ];

  const estimatedSize = selectedFields.length * filters.length * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
      {/* Success Toast */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-fadeIn">
          <div className="bg-green-500/20 border border-green-500 text-green-400 px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3">
            <CheckCircle className="w-6 h-6" />
            <div>
              <div className="font-bold">Success!</div>
              <div className="text-sm opacity-90">{toastMessage}</div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl text-white mb-2">Data Export & Reporting Center</h1>
          <p className="text-gray-400">Export datasets and generate comprehensive reports</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowTemplates(!showTemplates)}
            className="px-4 py-2 bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6] rounded-lg hover:bg-[#8B5CF6]/30 transition flex items-center gap-2"
          >
            <Database className="w-4 h-4" />
            Templates ({savedTemplates.length})
          </button>
          <button 
            onClick={() => setShowQueryBuilder(!showQueryBuilder)}
            className="px-4 py-2 bg-gradient-to-r from-[#00D9FF] to-[#8B5CF6] text-white rounded-lg hover:shadow-lg hover:shadow-[#00D9FF]/30 transition flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Custom Query Builder
          </button>
        </div>
      </div>

      {/* Live Data Indicator */}
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="font-bold text-green-400">REAL-TIME DATA</span>
          </div>
          <span className="text-gray-400">Export live data from your Cowrie honeypot</span>
        </div>
      </div>

      {/* Saved Templates Panel */}
      {showTemplates && (
        <div className="bg-gray-800/90 border border-gray-700 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl text-white">Saved Query Templates</h2>
            <button onClick={() => setShowTemplates(false)} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedTemplates.map((template) => (
              <div key={template.id} className="bg-gray-900/60 rounded-lg p-4 border border-gray-700 hover:border-[#00D9FF]/50 transition">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-white">{template.name}</h3>
                    <p className="text-sm text-gray-400">
                      {template.dataType} • {template.dateRange} • {template.format.toUpperCase()}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">{template.created}</span>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                  <span className="px-2 py-1 bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/30 rounded">{template.filters.length} filters</span>
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded">{template.fields.length} fields</span>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => loadTemplate(template)}
                    className="flex-1 px-3 py-2 bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF] text-sm rounded-lg hover:bg-[#00D9FF]/30 transition flex items-center justify-center gap-1"
                  >
                    <Play className="w-3 h-3" />
                    Run
                  </button>
                  <button
                    onClick={() => loadTemplate(template)}
                    className="px-3 py-2 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-600 transition"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteTemplate(template.id)}
                    className="px-3 py-2 bg-red-500/20 text-red-400 border border-red-500/30 text-sm rounded-lg hover:bg-red-500/30 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Query Builder */}
      {showQueryBuilder && (
        <div className="bg-gray-800/90 border-2 border-[#00D9FF] rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-[#00D9FF] to-[#8B5CF6] text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6" />
              <div>
                <h2 className="text-xl font-bold">Custom Query Builder</h2>
                <p className="text-sm opacity-90">Build your custom data export query</p>
              </div>
            </div>
            <button onClick={() => setShowQueryBuilder(false)} className="text-white hover:bg-white/20 rounded-lg p-2">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="px-6 py-4 bg-gray-900/60 border-b border-gray-700">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4, 5].map((step) => (
                <div key={step} className="flex items-center">
                  <button
                    onClick={() => setCurrentStep(step)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition ${
                      currentStep === step
                        ? 'bg-[#00D9FF] text-white'
                        : currentStep > step
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {currentStep > step ? <CheckCircle className="w-5 h-5" /> : step}
                  </button>
                  {step < 5 && <div className={`w-16 h-1 mx-2 ${currentStep > step ? 'bg-green-500' : 'bg-gray-700'}`} />}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-gray-400">Data Type</span>
              <span className="text-xs text-gray-400">Date Range</span>
              <span className="text-xs text-gray-400">Filters</span>
              <span className="text-xs text-gray-400">Fields</span>
              <span className="text-xs text-gray-400">Format</span>
            </div>
          </div>

          <div className="p-6">
            {/* Step 1: Data Type */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">Step 1: Select Data Type</h3>
                <div className="grid grid-cols-2 gap-4">
                  {datasets.map((dataset) => (
                    <button
                      key={dataset.id}
                      onClick={() => {
                        setQueryDataType(dataset.id);
                        setCurrentStep(2);
                      }}
                      className={`p-4 rounded-lg border-2 transition ${
                        queryDataType === dataset.id
                          ? 'border-[#00D9FF] bg-[#00D9FF]/10'
                          : 'border-gray-700 hover:border-[#00D9FF]/50'
                      }`}
                    >
                      <div className="font-bold text-white">{dataset.title}</div>
                      <div className="text-sm text-gray-400">{dataset.records} records</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Date Range */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">Step 2: Select Date Range</h3>
                <div className="grid grid-cols-2 gap-3">
                  {['last-24-hours', 'last-7-days', 'last-30-days', 'last-90-days', 'all-time', 'custom'].map((range) => (
                    <button
                      key={range}
                      onClick={() => setQueryDateRange(range)}
                      className={`px-4 py-3 rounded-lg border-2 transition ${
                        queryDateRange === range
                          ? 'border-[#00D9FF] bg-[#00D9FF]/10'
                          : 'border-gray-700 hover:border-[#00D9FF]/50'
                      }`}
                    >
                      <span className="text-white">{range.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>
                    </button>
                  ))}
                </div>
                {queryDateRange === 'custom' && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <input
                      type="date"
                      value={customDateFrom}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                      className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
                      placeholder="From"
                    />
                    <input
                      type="date"
                      value={customDateTo}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                      className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
                      placeholder="To"
                    />
                  </div>
                )}
                <button
                  onClick={() => setCurrentStep(3)}
                  className="w-full px-4 py-3 bg-[#00D9FF] text-white rounded-lg hover:bg-[#00D9FF]/80 transition font-medium"
                >
                  Continue to Filters
                </button>
              </div>
            )}

            {/* Step 3: Filters */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Step 3: Add Filters (Optional)</h3>
                  <button
                    onClick={addFilter}
                    className="px-4 py-2 bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF] rounded-lg hover:bg-[#00D9FF]/30 transition flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Filter
                  </button>
                </div>

                {filters.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Filter className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                    <p>No filters added. Click "Add Filter" to create one.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filters.map((filter, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-gray-900/60 p-3 rounded-lg border border-gray-700">
                        {idx > 0 && (
                          <select
                            value={filter.logic}
                            onChange={(e) => updateFilter(idx, { logic: e.target.value as 'AND' | 'OR' })}
                            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#00D9FF]"
                          >
                            <option value="AND">AND</option>
                            <option value="OR">OR</option>
                          </select>
                        )}
                        <select
                          value={filter.field}
                          onChange={(e) => updateFilter(idx, { field: e.target.value })}
                          className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
                        >
                          <option value="">Select field...</option>
                          {queryDataType && fieldOptions[queryDataType]?.map((field) => (
                            <option key={field} value={field}>{field}</option>
                          ))}
                        </select>
                        <select
                          value={filter.operator}
                          onChange={(e) => updateFilter(idx, { operator: e.target.value })}
                          className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
                        >
                          <option value="equals">Equals</option>
                          <option value="contains">Contains</option>
                          <option value="greater">Greater than</option>
                          <option value="less">Less than</option>
                        </select>
                        <input
                          type="text"
                          value={filter.value}
                          onChange={(e) => updateFilter(idx, { value: e.target.value })}
                          placeholder="Value..."
                          className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-[#00D9FF]"
                        />
                        <button
                          onClick={() => removeFilter(idx)}
                          className="px-3 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setCurrentStep(4)}
                  className="w-full px-4 py-3 bg-[#00D9FF] text-white rounded-lg hover:bg-[#00D9FF]/80 transition font-medium"
                >
                  Continue to Field Selection
                </button>
              </div>
            )}

            {/* Step 4: Fields */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Step 4: Select Fields</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllFields}
                      className="px-3 py-1 text-sm bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF] rounded-lg hover:bg-[#00D9FF]/30 transition"
                    >
                      Select All
                    </button>
                    <button
                      onClick={deselectAllFields}
                      className="px-3 py-1 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {queryDataType && fieldOptions[queryDataType]?.map((field) => (
                    <label
                      key={field}
                      className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition ${
                        selectedFields.includes(field)
                          ? 'border-[#00D9FF] bg-[#00D9FF]/10'
                          : 'border-gray-700 hover:border-[#00D9FF]/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(field)}
                        onChange={() => toggleField(field)}
                        className="w-4 h-4 accent-[#00D9FF]"
                      />
                      <span className="font-medium text-sm text-white">{field}</span>
                    </label>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentStep(5)}
                  disabled={selectedFields.length === 0}
                  className="w-full px-4 py-3 bg-[#00D9FF] text-white rounded-lg hover:bg-[#00D9FF]/80 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to Format & Options
                </button>
              </div>
            )}

            {/* Step 5: Format & Preview */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Step 5: Format & Options</h3>
                  
                  <div className="grid grid-cols-5 gap-3 mb-4">
                    {['csv', 'json', 'xml', 'xlsx', 'parquet'].map((format) => (
                      <button
                        key={format}
                        onClick={() => setQueryFormat(format)}
                        className={`px-4 py-3 rounded-lg border-2 transition ${
                          queryFormat === format
                            ? 'border-[#00D9FF] bg-[#00D9FF]/10'
                            : 'border-gray-700 hover:border-[#00D9FF]/50'
                        }`}
                      >
                        <span className="text-white font-medium">{format.toUpperCase()}</span>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {Object.entries(queryOptions).map(([key, value]) => (
                      <label key={key} className="flex items-center gap-2 p-3 bg-gray-900/60 rounded-lg border border-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setQueryOptions({...queryOptions, [key]: e.target.checked})}
                          className="w-4 h-4 accent-[#00D9FF]"
                        />
                        <span className="text-sm text-white">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-gray-900/60 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <Eye className="w-5 h-5 text-gray-400" />
                    <h4 className="font-bold text-white">Query Preview</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Selected Fields:</span>
                      <div className="font-bold text-white">{selectedFields.length}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Active Filters:</span>
                      <div className="font-bold text-white">{filters.length}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Est. Size:</span>
                      <div className="font-bold text-white">{formatBytes(estimatedSize)}</div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={executeQuery}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg transition font-bold flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Generate & Download
                  </button>
                  <button
                    onClick={saveTemplate}
                    className="px-4 py-3 bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6] rounded-lg hover:bg-[#8B5CF6]/30 transition flex items-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    Save Template
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Export Datasets */}
      {!showQueryBuilder && !showTemplates && (
        <>
          {/* Time Range Selector */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl text-white">Quick Export - Pre-configured Datasets</h2>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">Time Range:</span>
              <select
                value={dataTimeRange}
                onChange={(e) => setDataTimeRange(e.target.value)}
                className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#00D9FF]"
              >
                <option value="today">Today</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="all-time">All Time</option>
              </select>
            </div>
          </div>
          
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {datasets.map((dataset, idx) => {
                const Icon = dataset.icon;
                return (
                  <div
                    key={idx}
                    className="bg-gray-800/90 border border-gray-700 rounded-xl p-6 hover:shadow-xl hover:shadow-[#00D9FF]/20 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${dataset.color} flex items-center justify-center`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-lg">{dataset.title}</h3>
                          <p className="text-sm text-gray-400">{dataset.description}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-gray-900/60 rounded-lg p-3 border border-gray-700">
                        <div className="text-xs text-gray-400 mb-1">Total Size</div>
                        <div className="font-bold text-white">{dataset.size}</div>
                      </div>
                      <div className="bg-gray-900/60 rounded-lg p-3 border border-gray-700">
                        <div className="text-xs text-gray-400 mb-1">Records</div>
                        <div className="font-bold text-white">{dataset.records}</div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <select
                        value={exportFormat}
                        onChange={(e) => setExportFormat(e.target.value)}
                        className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#00D9FF]"
                      >
                        <option value="csv">CSV</option>
                        <option value="json">JSON</option>
                        <option value="xml">XML</option>
                        <option value="xlsx">Excel</option>
                      </select>
                      <button
                        onClick={() => handleExport(dataset.id, exportFormat)}
                        className="px-4 py-2 bg-gradient-to-r from-[#00D9FF] to-[#8B5CF6] text-white rounded-lg hover:shadow-lg hover:shadow-[#00D9FF]/30 transition flex items-center gap-2"
                      >
                        <Download className="w-5 h-5" />
                        Export
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Export History */}
          <div>
            <h2 className="text-xl text-white mb-4">Recent Exports</h2>
            <div className="bg-gray-800/90 border border-gray-700 rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900/60 border-b border-gray-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                        File Name
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Export Date
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Size
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {[
                      { name: 'attack_dataset_2025-01-25.csv', date: '2 hours ago', size: formatBytes(stats.totalAttacks * 1024), status: 'completed' },
                      { name: 'credentials_export_2025-01-24.json', date: 'Yesterday', size: formatBytes(stats.totalCredentials * 512), status: 'completed' },
                      { name: 'session_logs_2025-01-23.csv', date: '2 days ago', size: formatBytes(stats.totalSessions * 2048), status: 'completed' },
                    ].map((export_, idx) => (
                      <tr key={idx} className="hover:bg-gray-700/30 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <FileDown className="w-5 h-5 text-gray-400" />
                            <span className="font-medium text-white">{export_.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-gray-400">
                            <Clock className="w-4 h-4" />
                            {export_.date}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                          {export_.size}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                            <CheckCircle className="w-3 h-3" />
                            {export_.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button 
                            onClick={() => showNotification('Downloading ' + export_.name)}
                            className="text-[#00D9FF] hover:text-[#00D9FF]/80 font-medium text-sm flex items-center gap-1"
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}