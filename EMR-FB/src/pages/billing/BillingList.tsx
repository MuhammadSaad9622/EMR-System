import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Search, 
  Plus, 
  Edit, 
  Eye, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  DollarSign,
  FileText,
  AlertTriangle
} from 'lucide-react';

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  patient: Patient | string; // Can be either patient object or just the ID
  dateIssued: string;
  dueDate: string;
  total: number;
  status: string;
}

interface BillingListProps {
  patientId?: string;
  showPatientColumn?: boolean;
  showHeader?: boolean;
  onInvoiceCountChange?: (count: number) => void; // ✅ NEW
}


const BillingList: React.FC<BillingListProps> = ({
  patientId = '',
  showPatientColumn = true,
  showHeader = true,
  onInvoiceCountChange // ✅ NEW
}) => {

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [billingStats, setBillingStats] = useState({
    billedThisMonth: 0,
    collectedThisMonth: 0,
    outstanding: 0
  });

  useEffect(() => {
    if (patientId) {
      fetchInvoices();
      fetchBillingSummary();
    }
  }, [patientId, currentPage, statusFilter, dateRange]);
  

  const fetchInvoices = async () => {
    if (!patientId) return; // prevent bad request if missing
    setIsLoading(true);
    try {
      let url = `http://localhost:5000/api/billing?page=${currentPage}`;
      
      // Always filter by patientId if provided
      if (patientId) {
        // url += `&patientId=${patientId}`;
        url += `&patient=${patientId}`;
      }
      
      if (searchTerm) {
        url += `&search=${searchTerm}`;
      }
      
      if (statusFilter) {
        url += `&status=${statusFilter}`;
      }
      
      if (dateRange.startDate) {
        url += `&startDate=${dateRange.startDate}`;
      }
      
      if (dateRange.endDate) {
        url += `&endDate=${dateRange.endDate}`;
      }
      
      const response = await axios.get(url);
      const filteredInvoices = response.data.invoices.filter((invoice: Invoice) => {
        if (!patientId) return true;
        if (typeof invoice.patient === 'string') {
          return invoice.patient === patientId;
        }
        return invoice.patient._id === patientId;
      });
      setInvoices(filteredInvoices);
      setTotalPages(response.data.totalPages);
      
      // ✅ Notify parent with invoice count
      if (onInvoiceCountChange) {
        onInvoiceCountChange(filteredInvoices.length); // ✅ this will now send the correct count for the current page
      }
      
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBillingSummary = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/billing/summary/dashboard');
      setBillingStats(response.data);
    } catch (error) {
      console.error('Error fetching billing summary:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchInvoices();
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to get patient name from invoice
  const getPatientName = (invoice: Invoice): string => {
    if (!invoice.patient) return 'Unknown Patient';
    
    if (typeof invoice.patient === 'string') {
      // If patient is just an ID, we can't show the name
      return 'Patient';
    }
    
    return `${invoice.patient.firstName} ${invoice.patient.lastName}`;
  };

  // Helper function to check if invoice belongs to current patient
  const isInvoiceForCurrentPatient = (invoice: Invoice): boolean => {
    if (!patientId) return true;
    
    if (typeof invoice.patient === 'string') {
      return invoice.patient === patientId;
    }
    
    return invoice.patient._id === patientId;
  };

  return (
    <div className="container mx-auto px-4">
      {showHeader && !patientId && (

        <>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h1 className="text-2xl font-semibold text-gray-800 mb-4 md:mb-0">
              {patientId ? 'Patient Billing' : 'Billing & Invoices'}
            </h1>
            <Link
              to={patientId ? `/billing/new?patientId=${patientId}` : "/billing/new"}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Link>
          </div>
          
          {/* Billing Stats */}
          {!patientId && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 mr-4">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Billed This Month</p>
                  <p className="text-2xl font-semibold text-gray-800">${billingStats.billedThisMonth.toFixed(2)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 mr-4">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Collected This Month</p>
                  <p className="text-2xl font-semibold text-gray-800">${billingStats.collectedThisMonth.toFixed(2)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 mr-4">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Outstanding Balance</p>
                  <p className="text-2xl font-semibold text-gray-800">${billingStats.outstanding.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
            )}
        </>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          {/* Search Invoices */}
          <div className="flex-1 min-w-[250px]">
            <label htmlFor="searchInvoices" className="block text-sm font-medium text-gray-700 mb-1">
              Search Invoices
            </label>
            <form onSubmit={handleSearch} className="flex">
              <div className="relative flex-grow">
                <input
                  id="searchInvoices"
                  type="text"
                  placeholder="Search invoices..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button
                  type="submit"
                  className="absolute right-0 top-0 h-full px-3 text-gray-500 hover:text-gray-700"
                  aria-label="Search"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
              <button
                type="submit"
                className="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 transition-colors text-sm whitespace-nowrap"
              >
                Search
              </button>
            </form>
          </div>
          
          {/* Status */}
          <div className="flex-1 min-w-[150px]">
            <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          
          {/* From Date */}
          <div className="flex-1 min-w-[150px]">
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateRangeChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          
          {/* To Date */}
          <div className="flex-1 min-w-[150px]">
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateRangeChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice #
                    </th>
                    {showPatientColumn && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Patient
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Issued
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.length > 0 ? (
                    invoices
                      .filter(isInvoiceForCurrentPatient)
                      .map((invoice) => (
                        <tr key={invoice._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {invoice.invoiceNumber}
                          </td>
                          {showPatientColumn && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {getPatientName(invoice)}
                            </td>
                          )}

                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(invoice.dateIssued).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(invoice.dueDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            ${invoice.total.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(invoice.status)}`}
                            >
                              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                            </span>
                          </td>
                        {/* <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(invoice.status)}`}
                          >
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </span>
                        </td> */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Link
                              to={`/billing/${invoice._id}`}
                              className="text-blue-600 hover:text-blue-900"
                              title="View Invoice"
                            >
                              <Eye className="w-5 h-5" />
                            </Link>
                            {invoice.status !== 'paid' && (
                              <Link
                                to={`/billing/${invoice._id}/edit`}
                                className="text-yellow-600 hover:text-yellow-900"
                                title="Edit Invoice"
                              >
                                <Edit className="w-5 h-5" />
                              </Link>
                            )}
                            <Link
                              to={`/billing/${invoice._id}/download`}
                              className="text-green-600 hover:text-green-900"
                              title="Download Invoice"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download className="w-5 h-5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                        No invoices found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                      currentPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                      currentPage === totalPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing page <span className="font-medium">{currentPage}</span> of{' '}
                      <span className="font-medium">{totalPages}</span>
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                          currentPage === 1
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <span className="sr-only">Previous</span>
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`relative inline-flex items-center px-4 py-2 border ${
                            currentPage === page
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          } text-sm font-medium`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                          currentPage === totalPages
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <span className="sr-only">Next</span>
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BillingList;