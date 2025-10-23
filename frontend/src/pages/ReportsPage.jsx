import React, { useState } from 'react';
import { 
  Download, 
  FileText, 
  BarChart3, 
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

const ReportsPage = ({ isDarkMode = true }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleGenerateReport = async (reportType) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      let response;
      let downloadType = reportType;
      switch (reportType) {
        case 'sales':
          response = await reportsAPI.generateSalesReport();
          break;
        case 'inventory':
          response = await reportsAPI.generateInventoryReport();
          break;
        case 'expenses':
          response = await reportsAPI.generateExpensesReport();
          break;
        case 'business':
          response = await reportsAPI.generateBusinessReport();
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
      color: '#A5BF13',
      gradient: 'from-[#A5BF13] to-[#94A90F]',
      bgColor: 'bg-[#2A2A2A]',
      textColor: 'text-[#A5BF13]'
    },
    {
      id: 'inventory',
      name: 'Inventory Report',
      description: 'Export current inventory status and stock levels',
      icon: Package,
      color: '#F79824',
      gradient: 'from-[#F79824] to-[#E88A1A]',
      bgColor: 'bg-[#2A2A2A]',
      textColor: 'text-[#F79824]'
    },
    {
      id: 'expenses',
      name: 'Expenses Report',
      description: 'Track and analyze business expenses',
      icon: TrendingDown,
      color: '#B4182D',
      gradient: 'from-[#B4182D] to-[#A31526]',
      bgColor: 'bg-[#2A2A2A]',
      textColor: 'text-[#B4182D]'
    },
    {
      id: 'business',
      name: 'Business Report',
      description: 'Comprehensive business overview and analytics',
      icon: BarChart3,
      color: '#C1E8FF',
      gradient: 'from-[#C1E8FF] to-[#A8D4E6]',
      bgColor: 'bg-[#2A2A2A]',
      textColor: 'text-[#C1E8FF]'
    }
  ];

  return (
    <div className={`h-screen p-6 overflow-hidden transition-all duration-500 ${isDarkMode ? 'bg-[#202020]' : 'bg-white'}`}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-2xl font-bold transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-800'}`}>Reports</h1>
              <p className="text-sm text-[#A5BF13]">Generate and download business reports</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`text-xs text-[#A5BF13] px-3 py-1 rounded-lg border hover:shadow-lg hover:shadow-[#A5BF13]/20 transition-all duration-300 ${isDarkMode ? 'bg-[#2A2A2A] border-[#3A3A3A]' : 'bg-gray-100 border-gray-300'}`}>
                <Clock className="inline h-3 w-3 mr-1" />
                Auto-save to POSBackups
              </div>
            </div>
          </div>
        </div>


        {/* Error/Success messages */}
        {error && (
          <div className={`mb-4 border border-[#B4182D] rounded-lg p-3 hover:shadow-lg hover:shadow-[#B4182D]/20 transition-all duration-300 ${isDarkMode ? 'bg-[#2A2A2A]' : 'bg-red-50'}`}>
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-[#B4182D] mr-2 animate-pulse" />
              <p className={`text-sm transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-red-800'}`}>{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className={`mb-4 border border-[#A5BF13] rounded-lg p-3 hover:shadow-lg hover:shadow-[#A5BF13]/20 transition-all duration-300 ${isDarkMode ? 'bg-[#2A2A2A]' : 'bg-green-50'}`}>
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-[#A5BF13] mr-2 animate-pulse" />
              <p className={`text-sm transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-green-800'}`}>{success}</p>
            </div>
          </div>
        )}

        {/* Report Types Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reportTypes.map((report) => {
              const Icon = report.icon;
              return (
                <div key={report.id} className={`rounded-xl shadow-lg p-4 hover:shadow-xl hover:shadow-[#A5BF13]/20 hover:-translate-y-2 transition-all duration-300 group border ${isDarkMode ? 'bg-[#2A2A2A] border-[#3A3A3A]' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-[${report.color}] flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300`}>
                        <Icon className="h-5 w-5 text-black" />
                      </div>
                      <div>
                        <h3 className={`text-lg font-semibold group-hover:text-[#A5BF13] transition-colors duration-300 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-800'}`}>{report.name}</h3>
                        <p className="text-sm text-[#A5BF13]">{report.description}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-[#A5BF13]">
                      <span>Format:</span>
                      <span className={`font-medium transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-800'}`}>Excel (.xlsx)</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#A5BF13]">
                      <span>Auto-save:</span>
                      <span className="font-medium text-[#A5BF13]">Enabled</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleGenerateReport(report.id)}
                    disabled={loading}
                    className={`w-full mt-4 bg-[${report.color}] text-black px-4 py-2 rounded-lg font-semibold text-sm hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[${report.color}] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all ripple relative overflow-hidden group`}
                  >
                    {/* Ripple effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent relative z-10"></div>
                        <span className="relative z-10">Generating...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 relative z-10 group-hover:animate-pulse" />
                        <span className="relative z-10">Generate Report</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Report Info Card */}
        <div className={`mt-6 rounded-xl shadow-lg p-4 hover:shadow-xl hover:shadow-[#A5BF13]/20 transition-all duration-300 border ${isDarkMode ? 'bg-[#2A2A2A] border-[#3A3A3A]' : 'bg-white border-gray-200'}`}>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-[#A5BF13] rounded-lg flex items-center justify-center hover:scale-110 transition-all duration-300">
              <Info className="h-4 w-4 text-black" />
            </div>
            <div className="flex-1">
              <h3 className={`text-sm font-semibold mb-2 transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-800'}`}>Report Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#A5BF13]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-[#A5BF13]" />
                    <span>Excel (.xlsx) format</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-[#A5BF13]" />
                    <span>Auto-saved to POSBackups</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-[#A5BF13]" />
                    <span>Comprehensive data included</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-[#A5BF13]" />
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