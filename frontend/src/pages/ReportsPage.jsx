import React, { useState } from 'react';
import { 
  Download, 
  FileText, 
  BarChart3, 
  Calendar,
  DollarSign,
  Package,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  Clock,
  Info
} from 'lucide-react';
import { reportsAPI } from '../services/api';

const ReportsPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reportParams, setReportParams] = useState({
    start_date: '',
    end_date: '',
    period: 'month'
  });

  const handleGenerateReport = async (reportType) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      let response;
      const params = { ...reportParams };
      let downloadType = reportType;
      switch (reportType) {
        case 'sales':
          response = await reportsAPI.generateSalesReport(params);
          break;
        case 'inventory':
          response = await reportsAPI.generateInventoryReport(params);
          break;
        case 'expenses':
          response = await reportsAPI.generateExpensesReport(params);
          break;
        case 'business':
          response = await reportsAPI.generateBusinessReport(params);
          break;
        default:
          throw new Error('Invalid report type');
      }

      if (response.data.success && response.data.fileName) {
        setSuccess(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report generated successfully! Downloading...`);
        // Download the file
        const downloadResponse = await reportsAPI.downloadExcel(downloadType, response.data.fileName);
        const url = window.URL.createObjectURL(new Blob([downloadResponse.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', response.data.fileName);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        setTimeout(() => setSuccess(''), 3000);
      } else if (response.data.success) {
        setSuccess(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report generated successfully!`);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const reportTypes = [
    {
      id: 'sales',
      name: 'Sales Report',
      description: 'Generate detailed sales reports with invoice data',
      icon: DollarSign,
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      id: 'inventory',
      name: 'Inventory Report',
      description: 'Export current inventory status and stock levels',
      icon: Package,
      color: 'green',
      gradient: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      id: 'expenses',
      name: 'Expenses Report',
      description: 'Generate expense reports by category and date range',
      icon: FileText,
      color: 'red',
      gradient: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600'
    },
    {
      id: 'business',
      name: 'Business Summary',
      description: 'Comprehensive business overview with all data',
      icon: BarChart3,
      color: 'purple',
      gradient: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    }
  ];

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
              <p className="text-sm text-slate-600">Generate and export business reports</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-slate-500 bg-white px-3 py-1 rounded-lg border border-slate-200">
                <Clock className="inline h-3 w-3 mr-1" />
                Auto-save to POSBackups
              </div>
            </div>
          </div>
        </div>

        {/* Report Parameters */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Report Parameters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={reportParams.start_date}
                onChange={(e) => setReportParams({...reportParams, start_date: e.target.value})}
                className="block w-full px-3 py-2 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={reportParams.end_date}
                onChange={(e) => setReportParams({...reportParams, end_date: e.target.value})}
                className="block w-full px-3 py-2 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Period
              </label>
              <select
                value={reportParams.period}
                onChange={(e) => setReportParams({...reportParams, period: e.target.value})}
                className="block w-full px-3 py-2 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error/Success messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
              <p className="text-green-700 text-sm">{success}</p>
            </div>
          </div>
        )}

        {/* Report Types Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reportTypes.map((report) => {
              const Icon = report.icon;
              return (
                <div key={report.id} className="bg-white rounded-xl shadow-lg p-4 hover:shadow-xl transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${report.gradient} flex items-center justify-center`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{report.name}</h3>
                        <p className="text-sm text-slate-600">{report.description}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Format:</span>
                      <span className="font-medium">Excel (.xlsx)</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Auto-save:</span>
                      <span className="font-medium text-green-600">Enabled</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleGenerateReport(report.id)}
                    disabled={loading}
                    className={`w-full mt-4 bg-gradient-to-r ${report.gradient} text-white px-4 py-2 rounded-lg font-semibold text-sm hover:from-${report.color}-600 hover:to-${report.color}-700 focus:outline-none focus:ring-2 focus:ring-${report.color}-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all`}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Generate Report
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Report Info Card */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Info className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Report Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span>Excel (.xlsx) format</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span>Auto-saved to POSBackups</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span>Comprehensive data included</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span>Business summary available</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage; 