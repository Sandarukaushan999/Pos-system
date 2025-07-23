import React, { useState } from 'react';
import { 
  Download, 
  FileText, 
  BarChart3, 
  Calendar,
  DollarSign,
  Package
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
      color: 'blue'
    },
    {
      id: 'inventory',
      name: 'Inventory Report',
      description: 'Export current inventory status and stock levels',
      icon: Package,
      color: 'green'
    },
    {
      id: 'expenses',
      name: 'Expenses Report',
      description: 'Generate expense reports by category and date range',
      icon: FileText,
      color: 'red'
    },
    {
      id: 'business',
      name: 'Business Summary',
      description: 'Comprehensive business overview with all data',
      icon: BarChart3,
      color: 'purple'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">
          Generate and export business reports
        </p>
      </div>

      {/* Report parameters */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Report Parameters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={reportParams.start_date}
              onChange={(e) => setReportParams({...reportParams, start_date: e.target.value})}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={reportParams.end_date}
              onChange={(e) => setReportParams({...reportParams, end_date: e.target.value})}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Period
            </label>
            <select
              value={reportParams.period}
              onChange={(e) => setReportParams({...reportParams, period: e.target.value})}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <div className="mt-2 text-sm text-green-700">{success}</div>
            </div>
          </div>
        </div>
      )}

      {/* Report types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          return (
            <div key={report.id} className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className={`p-2 rounded-lg bg-${report.color}-100`}>
                  <Icon className={`h-6 w-6 text-${report.color}-600`} />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">{report.name}</h3>
                  <p className="text-sm text-gray-500">{report.description}</p>
                </div>
              </div>
              
              <button
                onClick={() => handleGenerateReport(report.id)}
                disabled={loading}
                className={`w-full bg-${report.color}-600 text-white px-4 py-2 rounded-md hover:bg-${report.color}-700 focus:outline-none focus:ring-2 focus:ring-${report.color}-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Report info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Report Information</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Reports are generated in Excel (.xlsx) format</li>
                <li>Files are automatically saved to the POSBackups folder</li>
                <li>Reports include comprehensive data for the selected period</li>
                <li>Business Summary includes all sales, expenses, and inventory data</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage; 