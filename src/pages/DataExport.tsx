import { useState } from 'react';
import { Download, FileText, Database, Package, Calendar, CheckCircle, Clock, FileDown } from 'lucide-react';

export function DataExport() {
  const [showToast, setShowToast] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [selectedDataset, setSelectedDataset] = useState('');

  const handleExport = (dataType: string, format: string) => {
    setSelectedDataset(dataType);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
    
    // Simulate download
    const filename = `honeypot_${dataType}_${new Date().toISOString().split('T')[0]}.${format}`;
    console.log(`Downloading: ${filename}`);
    
    // In a real app, you would trigger actual file download here
    // Example: window.location.href = `/api/export/${dataType}?format=${format}`;
  };

  const datasets = [
    {
      title: 'Complete Attack Dataset',
      description: 'All captured attacks with full details',
      size: '2.3 GB',
      records: '1,247,892',
      icon: Database,
      color: 'blue',
      id: 'attacks'
    },
    {
      title: 'Credentials Dataset',
      description: 'All attempted usernames and passwords',
      size: '45 MB',
      records: '342,156',
      icon: FileText,
      color: 'purple',
      id: 'credentials'
    },
    {
      title: 'Session Logs',
      description: 'Complete session recordings and commands',
      size: '1.8 GB',
      records: '89,432',
      icon: Package,
      color: 'green',
      id: 'sessions'
    },
    {
      title: 'Geographic Data',
      description: 'Country-wise attack statistics',
      size: '12 MB',
      records: '23,456',
      icon: Calendar,
      color: 'orange',
      id: 'geographic'
    },
  ];

  const exportHistory = [
    { name: 'attack_dataset_2025-01-19.csv', date: '2 hours ago', size: '234 MB', status: 'completed' },
    { name: 'credentials_export_2025-01-18.json', date: 'Yesterday', size: '45 MB', status: 'completed' },
    { name: 'session_logs_2025-01-17.zip', date: '2 days ago', size: '1.2 GB', status: 'completed' },
    { name: 'geographic_data_2025-01-16.csv', date: '3 days ago', size: '12 MB', status: 'completed' },
  ];

  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50 border-blue-200',
    purple: 'text-purple-600 bg-purple-50 border-purple-200',
    green: 'text-green-600 bg-green-50 border-green-200',
    orange: 'text-orange-600 bg-orange-50 border-orange-200',
  };

  return (
    <div className="space-y-6">
      {/* Success Toast */}
      {showToast && (
  <div className="fixed top-4 right-4 z-50 animate-fadeIn">
    <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3">
      <CheckCircle className="w-6 h-6" />
      <div>
        <div className="font-bold">Export Started!</div>
        <div className="text-sm opacity-90">
          Exporting {selectedDataset} as {exportFormat.toUpperCase()}...
        </div>
      </div>
    </div>
  </div>
)}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Data Export</h1>
          <p className="text-gray-500 mt-1">Export honeypot data in multiple formats</p>
        </div>
        
        {/* Format Selector */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 font-medium">Export Format:</span>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
            <option value="xml">XML</option>
            <option value="xlsx">Excel (XLSX)</option>
            <option value="zip">ZIP Archive</option>
          </select>
        </div>
      </div>

      {/* Available Datasets */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Available Datasets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {datasets.map((dataset, idx) => {
            const Icon = dataset.icon;
            return (
              <div
                key={idx}
                className={`bg-white rounded-xl border-2 p-6 hover:shadow-xl transition-all duration-300 ${
                  colorClasses[dataset.color as keyof typeof colorClasses]
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${colorClasses[dataset.color as keyof typeof colorClasses]}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">{dataset.title}</h3>
                      <p className="text-sm text-gray-500">{dataset.description}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white bg-opacity-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Total Size</div>
                    <div className="font-bold text-gray-800">{dataset.size}</div>
                  </div>
                  <div className="bg-white bg-opacity-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Records</div>
                    <div className="font-bold text-gray-800">{dataset.records}</div>
                  </div>
                </div>

                <button
                  onClick={() => handleExport(dataset.id, exportFormat)}
                  className="w-full bg-gradient-to-r from-primary-500 to-blue-500 text-white font-bold py-3 rounded-lg hover:shadow-lg transition flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Export as {exportFormat.toUpperCase()}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Export History */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Exports</h2>
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    File Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Export Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {exportHistory.map((export_, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <FileDown className="w-5 h-5 text-gray-400" />
                        <span className="font-medium text-gray-800">{export_.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-4 h-4" />
                        {export_.date}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {export_.size}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3" />
                        {export_.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1">
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

      {/* Export Info Box */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-500 text-white rounded-lg">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 mb-2">Export Guidelines</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Large datasets may take several minutes to prepare</li>
              <li>• CSV format is recommended for data analysis in Excel or Python</li>
              <li>• JSON format is best for programmatic processing</li>
              <li>• ZIP archives are automatically created for datasets over 500MB</li>
              <li>• Exports are retained for 7 days before automatic deletion</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}