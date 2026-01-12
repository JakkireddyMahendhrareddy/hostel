import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, AlertCircle, MinusCircle, Eye, ChevronDown, ChevronUp, Search, X, DollarSign } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import api from '../services/api';
import toast from 'react-hot-toast';

interface MonthlySummary {
  total_students: number;
  fully_paid: number;
  partially_paid: number;
  pending: number;
  total_due: number;
  total_paid: number;
  total_pending: number;
  month: string;
}

interface MonthlyFee {
  fee_id: number | null; // Can be null if fee record doesn't exist yet
  student_id: number;
  hostel_id: number;
  fee_month: string;
  fee_date: number;
  monthly_rent: number;
  carry_forward: number;
  total_due: number;
  paid_amount: number;
  balance: number;
  fee_status: 'Pending' | 'Partially Paid' | 'Fully Paid' | 'Overdue';
  due_date: string | null;
  notes?: string | null;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  room_number?: string;
  floor_number?: number;
  payment_count?: number;
  admission_date?: string;
}

interface PaymentMode {
  payment_mode_id: number;
  payment_mode_name: string;
  order_index?: number;
}

interface PaymentFormData {
  fee_id: string;
  student_id: string;
  hostel_id: string;
  amount: string;
  payment_date: string;
  payment_mode_id: string;
  transaction_id: string;
  receipt_number: string;
  notes: string;
}

interface EditFeeFormData {
  monthly_rent: string;
  carry_forward: string;
  due_date: string;
  notes: string;
}

interface AdjustmentFormData {
  amount: string;
  transaction_type: 'ADJUSTMENT' | 'REFUND';
  reason: string;
  payment_date: string;
  payment_mode_id: string;
  notes: string;
}

export const MonthlyFeeManagementPage: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [fees, setFees] = useState<MonthlyFee[]>([]);
  const [selectedFee, setSelectedFee] = useState<MonthlyFee | null>(null);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'FULLY_PAID' | 'PARTIALLY_PAID' | 'PENDING'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null);
  const [showStatsCard, setShowStatsCard] = useState(false);
  const [dateFilterStartDate, setDateFilterStartDate] = useState('');
  const [dateFilterEndDate, setDateFilterEndDate] = useState('');

  // Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditFeeModal, setShowEditFeeModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

  // Form states
  const [paymentForm, setPaymentForm] = useState<PaymentFormData>({
    fee_id: '',
    student_id: '',
    hostel_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode_id: '',
    transaction_id: '',
    receipt_number: '',
    notes: ''
  });

  const [editFeeForm, setEditFeeForm] = useState<EditFeeFormData>({
    monthly_rent: '',
    carry_forward: '',
    due_date: '',
    notes: ''
  });

  const [adjustmentForm, setAdjustmentForm] = useState<AdjustmentFormData>({
    amount: '',
    transaction_type: 'ADJUSTMENT',
    reason: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode_id: '',
    notes: ''
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const feesPerPage = 10;

  useEffect(() => {
    console.log('[MonthlyFeesPage] useEffect triggered, currentMonth:', currentMonth);
    fetchMonthlyFeesSummary();
    fetchPaymentModes();
  }, [currentMonth]);

  const fetchPaymentModes = async () => {
    try {
      const response = await api.get('/fees/payment-modes');
      setPaymentModes(response.data.data || []);
    } catch (error) {
      console.error('Fetch payment modes error:', error);
    }
  };

  const fetchMonthlyFeesSummary = async () => {
    console.log('[MonthlyFeesPage] fetchMonthlyFeesSummary called for month:', currentMonth);
    try {
      setLoading(true);
      const response = await api.get('/monthly-fees/summary', {
        params: { fee_month: currentMonth }
      });

      console.log('[MonthlyFeesPage] API response:', response.data);
      
      if (response.data && response.data.success) {
        const { summary: summaryData, fees: feesData } = response.data.data;
        console.log('[MonthlyFeesPage] Summary:', summaryData);
        console.log('[MonthlyFeesPage] Fees count:', feesData?.length || 0);
        setSummary(summaryData);
        setFees(feesData || []);
      } else {
        console.error('[MonthlyFeesPage] Response not successful:', response.data);
        toast.error(response.data?.error || 'Failed to fetch monthly fees');
        setSummary(null);
        setFees([]);
      }
    } catch (error: any) {
      console.error('[MonthlyFeesPage] Fetch fees error:', error);
      console.error('[MonthlyFeesPage] Error details:', {
        message: error?.message,
        response: error?.response,
        responseData: error?.response?.data,
        status: error?.response?.status
      });
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to fetch monthly fees';
      toast.error(errorMessage);
      setSummary(null);
      setFees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    console.log('[MonthlyFeesPage] handleRecordPayment called');
    console.log('[MonthlyFeesPage] paymentForm:', paymentForm);
    console.log('[MonthlyFeesPage] selectedFee:', selectedFee);

    if (!paymentForm.amount || !selectedFee || !paymentForm.payment_mode_id) {
      toast.error('Please fill all required fields');
      return;
    }

    const paymentAmount = parseFloat(paymentForm.amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    try {
      const payload = {
        fee_id: selectedFee.fee_id || null, // Can be null, backend will create fee record
        student_id: selectedFee.student_id,
        hostel_id: selectedFee.hostel_id,
        fee_month: currentMonth, // Pass the selected month
        amount: paymentAmount,
        payment_date: paymentForm.payment_date,
        payment_mode_id: parseInt(paymentForm.payment_mode_id),
        transaction_id: paymentForm.transaction_id || null,
        receipt_number: paymentForm.receipt_number || null,
        notes: paymentForm.notes || null
      };

      console.log('[MonthlyFeesPage] Sending payment payload:', payload);

      // Use fee_id if available, otherwise use a placeholder (backend will handle it)
      const feeIdParam = selectedFee.fee_id || 'new';
      const response = await api.post(`/monthly-fees/${feeIdParam}/payment`, payload);

      console.log('[MonthlyFeesPage] Payment response:', response.data);

      toast.success('Payment recorded successfully');
      setShowPaymentModal(false);
      setPaymentForm({
        fee_id: '',
        student_id: '',
        hostel_id: '',
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_mode_id: '',
        transaction_id: '',
        receipt_number: '',
        notes: ''
      });

      // Refresh data
      fetchMonthlyFeesSummary();
    } catch (error: any) {
      console.error('[MonthlyFeesPage] Payment error:', error);
      console.error('[MonthlyFeesPage] Error details:', {
        message: error?.message,
        response: error?.response,
        responseData: error?.response?.data,
        status: error?.response?.status
      });
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to record payment';
      toast.error(errorMessage);
    }
  };

  const handleEditFee = async () => {
    if (!selectedFee) {
      toast.error('No fee selected');
      return;
    }

    try {
      await api.put(`/monthly-fees/${selectedFee.fee_id}`, {
        monthly_rent: editFeeForm.monthly_rent ? parseFloat(editFeeForm.monthly_rent) : undefined,
        carry_forward: editFeeForm.carry_forward ? parseFloat(editFeeForm.carry_forward) : undefined,
        due_date: editFeeForm.due_date || undefined,
        notes: editFeeForm.notes || undefined
      });

      toast.success('Monthly fee updated successfully');
      setShowEditFeeModal(false);
      setEditFeeForm({
        monthly_rent: '',
        carry_forward: '',
        due_date: '',
        notes: ''
      });

      // Refresh data
      fetchMonthlyFeesSummary();
    } catch (error) {
      toast.error('Failed to update monthly fee');
      console.error('Edit error:', error);
    }
  };

  const navigate = useNavigate();

  const handleFetchPaymentHistory = (fee: MonthlyFee) => {
    // Navigate to the fee details page
    navigate(`/owner/monthly-fees/${fee.student_id}/${fee.fee_month}`);
  };

  const handleOpenPaymentModal = (fee: MonthlyFee) => {
    setSelectedFee(fee);
    setPaymentForm({
      fee_id: fee.fee_id ? fee.fee_id.toString() : '', // Can be empty, backend will create fee record
      student_id: fee.student_id.toString(),
      hostel_id: fee.hostel_id.toString(),
      amount: fee.balance > 0 ? fee.balance.toString() : '', // Auto-fill with balance amount
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode_id: '',
      transaction_id: '',
      receipt_number: '',
      notes: ''
    });
    setShowPaymentModal(true);
  };


  const handleRecordAdjustment = async () => {
    if (!selectedFee?.fee_id) {
      toast.error('Fee record not found');
      return;
    }

    if (!adjustmentForm.amount || !adjustmentForm.reason) {
      toast.error('Amount and reason are required');
      return;
    }

    const adjustmentAmount = parseFloat(adjustmentForm.amount);
    if (isNaN(adjustmentAmount) || adjustmentAmount === 0) {
      toast.error('Please enter a valid non-zero amount');
      return;
    }

    try {
      const payload = {
        amount: adjustmentAmount,
        transaction_type: adjustmentForm.transaction_type,
        reason: adjustmentForm.reason,
        payment_date: adjustmentForm.payment_date,
        payment_mode_id: adjustmentForm.payment_mode_id ? parseInt(adjustmentForm.payment_mode_id) : null,
        notes: adjustmentForm.notes || null
      };

      await api.post(`/monthly-fees/${selectedFee.fee_id}/adjustment`, payload);

      toast.success(`${adjustmentForm.transaction_type} recorded successfully`);
      setShowAdjustmentModal(false);

      // Refresh payment history
      await handleFetchPaymentHistory(selectedFee);

      // Refresh main data
      fetchMonthlyFeesSummary();
    } catch (error: any) {
      console.error('Adjustment error:', error);
      toast.error(error?.response?.data?.error || 'Failed to record adjustment');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Fully Paid':
        return 'bg-green-100 text-green-800';
      case 'Partially Paid':
        return 'bg-yellow-100 text-yellow-800';
      case 'Pending':
        return 'bg-red-100 text-red-800';
      case 'Overdue':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };



  console.log('[MonthlyFeesPage] Render - loading:', loading, 'summary:', summary, 'fees.length:', fees.length);

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Helper function to calculate due date
  const calculateDueDate = (fee: MonthlyFee): Date | null => {
    if (!fee.admission_date || !fee.fee_month) return null;
    const admissionDate = new Date(fee.admission_date);
    const admissionDay = admissionDate.getDate();
    const dueDay = admissionDay - 1;
    if (dueDay < 1) return null;
    const [year, month] = fee.fee_month.split('-').map(Number);
    return new Date(year, month - 1, dueDay);
  };

  // Helper function to convert date string to Date object
  const dateStringToDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const filteredFees = fees
    .filter((fee) => {
      // Apply status filter
      if (statusFilter !== 'ALL') {
        const statusMap: Record<string, string> = {
          'FULLY_PAID': 'Fully Paid',
          'PARTIALLY_PAID': 'Partially Paid',
          'PENDING': 'Pending'
        };
        if (fee.fee_status !== statusMap[statusFilter]) return false;
      }

      // Apply search filter
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        const includes = (field: any) => {
          if (field === null || field === undefined) return false;
          return field.toString().toLowerCase().includes(searchLower);
        };

        const matchesSearch = (
          includes(fee.first_name) ||
          includes(fee.last_name) ||
          includes(fee.phone) ||
          includes(fee.email) ||
          includes(fee.room_number) ||
          includes(fee.floor_number) ||
          includes(fee.fee_status) ||
          includes(fee.monthly_rent) ||
          includes(fee.total_due) ||
          includes(fee.balance)
        );

        if (!matchesSearch) return false;
      }

      // Apply date range filter by due date
      if (dateFilterStartDate && dateFilterEndDate) {
        const dueDate = calculateDueDate(fee);
        if (!dueDate) return false;

        const startDate = dateStringToDate(dateFilterStartDate);
        const endDate = dateStringToDate(dateFilterEndDate);

        if (dueDate < startDate || dueDate > endDate) return false;
      }

      return true;
    })
    .sort((a, b) => {
      // Sort by due date
      const dueDateA = calculateDueDate(a);
      const dueDateB = calculateDueDate(b);

      if (!dueDateA && !dueDateB) return 0;
      if (!dueDateA) return 1;
      if (!dueDateB) return -1;

      return dueDateA.getTime() - dueDateB.getTime();
    });

  // Calculate statistics
  const totalAmount = filteredFees.reduce((sum, fee) => sum + (fee.total_due || 0), 0);
  const pendingAmount = filteredFees.reduce((sum, fee) => sum + (fee.balance || 0), 0);

  // Pagination logic
  const totalPages = Math.ceil(filteredFees.length / feesPerPage);
  const indexOfLastFee = currentPage * feesPerPage;
  const indexOfFirstFee = indexOfLastFee - feesPerPage;
  const currentFees = filteredFees.slice(indexOfFirstFee, indexOfLastFee);

  // Smart pagination display - show 3 pages at a time
  const getPaginationPages = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 3;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(1, currentPage - 1);
      const end = Math.min(totalPages, start + maxVisible - 1);

      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleStatusFilterChange = (value: 'ALL' | 'FULLY_PAID' | 'PARTIALLY_PAID' | 'PENDING') => {
    setStatusFilter(value);
    setCurrentPage(1);  // Reset to page 1 when filter changes
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);  // Reset to page 1 when search changes
  };

  // Format month for display (e.g., "Jan 2026")
  const formatMonthDisplay = (monthValue: string) => {
    if (!monthValue) return '';
    const [year, month] = monthValue.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-4">
      {/* Mobile Header - Keep Original */}
      <div className="md:hidden space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Monthly Fee Management
          </h1>
          <p className="text-sm text-gray-600">
            Manage and track student fees by month
          </p>
        </div>

        {/* Mobile Month Selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Month:</label>
          <div className="relative inline-block flex-1">
            <input
              type="month"
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              style={{ fontSize: '16px', zIndex: 10 }}
            />
            <div className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white shadow-sm pointer-events-none flex items-center gap-1.5 min-w-[6rem]">
              <span>{formatMonthDisplay(currentMonth)}</span>
              <span className="text-gray-500">📅</span>
            </div>
          </div>
        </div>

        {/* Mobile Date Range Filter */}
        <div className="space-y-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
          <p className="text-xs font-medium text-gray-700">Filter by Due Date</p>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-600">From Date:</label>
              <input
                type="date"
                value={dateFilterStartDate}
                onChange={(e) => {
                  setDateFilterStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-600">To Date:</label>
              <input
                type="date"
                value={dateFilterEndDate}
                onChange={(e) => {
                  setDateFilterEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          {(dateFilterStartDate || dateFilterEndDate) && (
            <button
              onClick={() => {
                setDateFilterStartDate('');
                setDateFilterEndDate('');
                setCurrentPage(1);
              }}
              className="w-full px-2 py-1 text-xs text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Clear Filter
            </button>
          )}
        </div>

        {/* Mobile Status Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value as 'ALL' | 'FULLY_PAID' | 'PARTIALLY_PAID' | 'PENDING')}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white flex-1 min-w-0"
          >
            <option value="ALL">All</option>
            <option value="FULLY_PAID">Fully Paid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>

        {/* Mobile Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, phone, email, room, status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white shadow-sm"
          />
        </div>
      </div>

      {/* Desktop: Single Line Header */}
      <div className="hidden md:block">
        <h1 className="text-xl font-bold text-gray-900 mb-4">
          Monthly Fee Management
        </h1>

        {/* Desktop Filters Row 1: Search, Status, Month */}
        <div className="flex items-center gap-3 mb-4">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white shadow-sm"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value as 'ALL' | 'FULLY_PAID' | 'PARTIALLY_PAID' | 'PENDING')}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
          >
            <option value="ALL">All</option>
            <option value="FULLY_PAID">Fully Paid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PENDING">Pending</option>
          </select>

          {/* Month Picker */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Month:</label>
            <div className="relative inline-block cursor-pointer">
              <input
                type="month"
                value={currentMonth}
                onChange={(e) => setCurrentMonth(e.target.value)}
                className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                style={{ fontSize: '16px', zIndex: 30, margin: 0, padding: 0 }}
              />
              <div className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white shadow-sm pointer-events-none flex items-center gap-1.5 whitespace-nowrap select-none">
                <span>{formatMonthDisplay(currentMonth)}</span>
                <span className="text-gray-500">📅</span>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Filters Row 2: Date Range Filter */}
        <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-700">Filter by Due Date:</p>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">From:</label>
            <input
              type="date"
              value={dateFilterStartDate}
              onChange={(e) => {
                setDateFilterStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">To:</label>
            <input
              type="date"
              value={dateFilterEndDate}
              onChange={(e) => {
                setDateFilterEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
            />
          </div>
          {(dateFilterStartDate || dateFilterEndDate) && (
            <button
              onClick={() => {
                setDateFilterStartDate('');
                setDateFilterEndDate('');
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors ml-auto"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3">
        {filteredFees.length === 0 && !loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {statusFilter === 'ALL'
                ? `No active students found for ${currentMonth}. All active students with rooms will appear here automatically.`
                : `No students found with status "${statusFilter === 'FULLY_PAID' ? 'Fully Paid' : statusFilter === 'PARTIALLY_PAID' ? 'Partially Paid' : 'Pending'}" for ${currentMonth}.`}
            </p>
          </div>
        ) : (
          currentFees.map((fee) => {
            const isExpanded = expandedCardId === (fee.fee_id || fee.student_id);
            return (
              <div
                key={fee.fee_id || fee.student_id}
                className={`bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all ${isExpanded ? 'shadow-lg' : ''}`}
              >
                <div className="p-4">
                  {/* Collapsed View */}
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedCardId(isExpanded ? null : (fee.fee_id || fee.student_id))}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-gray-900 truncate">
                          {fee.first_name} {fee.last_name}
                        </p>
                        <p className="text-xs text-gray-500">{fee.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(fee.fee_status)}`}>
                        {fee.fee_status}
                      </span>
                      <span className="text-base font-bold text-red-600">
                        ₹{Math.floor(fee.balance)}
                      </span>
                    </div>
                  </div>

                  {/* Expanded View */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Room</p>
                          <p className="text-sm font-medium text-gray-900">
                            {fee.room_number || '-'} (Floor {fee.floor_number || '-'})
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Admitted</p>
                          <p className="text-sm font-medium text-gray-900">
                            {fee.admission_date ? new Date(fee.admission_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Due Date</p>
                          <p className="text-sm font-medium text-gray-900">
                            {(() => {
                              if (!fee.admission_date || !fee.fee_month) return '-';
                              const admissionDate = new Date(fee.admission_date);
                              const admissionDay = admissionDate.getDate();
                              const dueDay = admissionDay - 1;
                              if (dueDay < 1) return '-';
                              const [year, month] = fee.fee_month.split('-').map(Number);
                              const dueDate = new Date(year, month - 1, dueDay);
                              return dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                            })()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Monthly Rent</p>
                          <p className="text-sm font-medium text-gray-900">
                            ₹{Math.floor(fee.monthly_rent)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Carry Forward</p>
                          <p className="text-sm font-medium text-gray-900">
                            {fee.carry_forward > 0 ? `₹${Math.floor(fee.carry_forward)}` : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Total Due</p>
                          <p className="text-sm font-medium text-gray-900">
                            ₹{Math.floor(fee.total_due)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Paid</p>
                          <p className="text-sm font-medium text-green-600">
                            ₹{Math.floor(fee.paid_amount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Balance</p>
                          <p className={`text-sm font-medium ${fee.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ₹{Math.floor(fee.balance)}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCardId(null);
                            handleFetchPaymentHistory(fee);
                          }}
                          className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                          title="View History"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCardId(null);
                            handleOpenPaymentModal(fee);
                          }}
                          className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                          title="Record Payment"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-primary-600">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">S.NO</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">Student</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">Phone</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">Admitted</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">Due Date</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">Room</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">Floor</th>
                  <th className="px-3 py-2 text-right text-[10px] font-medium text-white uppercase tracking-wider">Monthly Rent</th>
                  <th className="px-3 py-2 text-right text-[10px] font-medium text-white uppercase tracking-wider">Carry Forward</th>
                  <th className="px-3 py-2 text-right text-[10px] font-medium text-white uppercase tracking-wider">Total Due</th>
                  <th className="px-3 py-2 text-right text-[10px] font-medium text-white uppercase tracking-wider">Paid</th>
                  <th className="px-3 py-2 text-right text-[10px] font-medium text-white uppercase tracking-wider">Balance</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentFees.map((fee, index) => (
                  <tr
                    key={fee.fee_id || fee.student_id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleFetchPaymentHistory(fee)}
                  >
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                      {indexOfFirstFee + index + 1}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                      {fee.first_name} {fee.last_name}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                      {fee.phone}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                      {fee.admission_date ? new Date(fee.admission_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                      {(() => {
                        if (!fee.admission_date || !fee.fee_month) return '-';
                        const admissionDate = new Date(fee.admission_date);
                        const admissionDay = admissionDate.getDate();
                        const dueDay = admissionDay - 1;
                        if (dueDay < 1) return '-';
                        const [year, month] = fee.fee_month.split('-').map(Number);
                        const dueDate = new Date(year, month - 1, dueDay);
                        return dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                      })()}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                      {fee.room_number || '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                      {fee.floor_number || '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 text-right">
                      ₹{Math.floor(fee.monthly_rent)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">
                      {fee.carry_forward > 0 ? (
                        <span className="text-orange-600">₹{Math.floor(fee.carry_forward)}</span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 text-right font-medium">
                      ₹{Math.floor(fee.total_due)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">
                      <span className="text-green-600">₹{Math.floor(fee.paid_amount)}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right font-medium">
                      <span className={fee.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                        ₹{Math.floor(fee.balance)}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs">
                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${getStatusColor(fee.fee_status)}`}>
                        {fee.fee_status}
                      </span>
                    </td>
                    <td
                      className="px-3 py-2 whitespace-nowrap text-xs text-gray-500"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => handleOpenPaymentModal(fee)}
                          className="text-green-600 hover:text-green-900"
                          title={fee.fee_id ? "Record Payment" : "Record Payment (Fee record will be created automatically)"}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {filteredFees.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {statusFilter === 'ALL'
                ? `No active students found for ${currentMonth}. All active students with rooms will appear here automatically.`
                : `No students found with status "${statusFilter === 'FULLY_PAID' ? 'Fully Paid' : statusFilter === 'PARTIALLY_PAID' ? 'Partially Paid' : 'Pending'}" for ${currentMonth}.`}
            </p>
          </div>
        )}

        {/* Pagination - Web View Only */}
        {filteredFees.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              {/* Left: Total Fees Info */}
              <div className="text-sm text-gray-600">
                Showing <span className="font-semibold text-gray-900">{indexOfFirstFee + 1}</span> to <span className="font-semibold text-gray-900">{Math.min(indexOfLastFee, filteredFees.length)}</span> of <span className="font-semibold text-gray-900">{filteredFees.length}</span> fees
              </div>

              {/* Center: Pagination Controls */}
              <div className="flex items-center space-x-1">
                {/* Previous Button */}
                {currentPage > 1 && (
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    className="px-3 py-2 rounded-md text-sm font-medium transition-colors bg-white text-blue-600 hover:bg-blue-50 border border-gray-300 hover:border-blue-600"
                  >
                    Previous
                  </button>
                )}

                {/* Page Numbers */}
                {getPaginationPages().map((pageNumber, index) => (
                  <button
                    key={index}
                    onClick={() => typeof pageNumber === 'number' && handlePageChange(pageNumber)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentPage === pageNumber
                        ? "bg-primary-600 text-white border border-primary-600"
                        : "bg-white text-gray-700 border border-gray-300 hover:border-primary-600 hover:text-primary-600"
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}

                {/* Next Button */}
                {currentPage < totalPages && (
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    className="px-3 py-2 rounded-md text-sm font-medium transition-colors bg-white text-blue-600 hover:bg-blue-50 border border-gray-300 hover:border-blue-600"
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Summary */}
      <div className="block md:hidden px-4 py-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-700">
          Showing <span className="font-medium">{filteredFees.length}</span> student{filteredFees.length !== 1 ? 's' : ''}
          {statusFilter !== 'ALL' && ` (${statusFilter === 'FULLY_PAID' ? 'Fully Paid' : statusFilter === 'PARTIALLY_PAID' ? 'Partially Paid' : 'Pending'})`}
        </p>
      </div>

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title={`Record Payment - ${selectedFee?.first_name} ${selectedFee?.last_name}`}
      >
        <div className="space-y-4 mb-6">
          {/* Balance Info */}
          {selectedFee && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Total Due:</span>
                  <span className="ml-2 font-medium">₹{Math.floor(selectedFee.total_due)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Paid:</span>
                  <span className="ml-2 font-medium text-green-600">₹{Math.floor(selectedFee.paid_amount)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Balance:</span>
                  <span className={`ml-2 font-medium ${selectedFee.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{Math.floor(selectedFee.balance)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount <span className="text-red-500">*</span></label>
              <input
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                placeholder="Enter amount"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                step="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
              <input
                type="date"
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode <span className="text-red-500">*</span></label>
              <select
                value={paymentForm.payment_mode_id}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_mode_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="">Select Payment Mode</option>
                {paymentModes.map(mode => (
                  <option key={mode.payment_mode_id} value={mode.payment_mode_id}>
                    {mode.payment_mode_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Number (Optional)</label>
              <input
                type="text"
                value={paymentForm.receipt_number}
                onChange={(e) => setPaymentForm({ ...paymentForm, receipt_number: e.target.value })}
                placeholder="RCP001"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID (Optional)</label>
            <input
              type="text"
              value={paymentForm.transaction_id}
              onChange={(e) => setPaymentForm({ ...paymentForm, transaction_id: e.target.value })}
              placeholder="TXN123456"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              placeholder="Add any notes..."
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button
            variant="secondary"
            onClick={() => setShowPaymentModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleRecordPayment}
          >
            Record Payment
          </Button>
        </div>
      </Modal>

      {/* Edit Fee Modal */}
      <Modal
        isOpen={showEditFeeModal}
        onClose={() => setShowEditFeeModal(false)}
        title={`Edit Fee - ${selectedFee?.first_name} ${selectedFee?.last_name}`}
      >
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent</label>
              <input
                type="number"
                value={editFeeForm.monthly_rent}
                onChange={(e) => setEditFeeForm({ ...editFeeForm, monthly_rent: e.target.value })}
                placeholder="Enter monthly rent"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Carry Forward</label>
              <input
                type="number"
                value={editFeeForm.carry_forward}
                onChange={(e) => setEditFeeForm({ ...editFeeForm, carry_forward: e.target.value })}
                placeholder="Enter carry forward amount"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                step="0.01"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input
              type="date"
              value={editFeeForm.due_date}
              onChange={(e) => setEditFeeForm({ ...editFeeForm, due_date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea
              value={editFeeForm.notes}
              onChange={(e) => setEditFeeForm({ ...editFeeForm, notes: e.target.value })}
              placeholder="Add any notes..."
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button
            variant="secondary"
            onClick={() => setShowEditFeeModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleEditFee}
          >
            Update Fee
          </Button>
        </div>
      </Modal>


      {/* Adjustment Modal */}
      <Modal
        isOpen={showAdjustmentModal}
        onClose={() => setShowAdjustmentModal(false)}
        title={`Add Adjustment - ${selectedFee?.first_name} ${selectedFee?.last_name}`}
      >
        <div className="space-y-4">
          {/* Warning Banner */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-orange-500 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-800">
                <p className="font-medium">Adjustment Entry</p>
                <p className="mt-1">Use this to correct payment errors. Enter a negative amount to reduce the paid amount (e.g., -1800 to correct an overpayment of ₹1800).</p>
              </div>
            </div>
          </div>

          {/* Current Status */}
          {selectedFee && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Total Due:</span>
                  <span className="ml-2 font-medium">₹{Math.floor(selectedFee.total_due)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Paid:</span>
                  <span className="ml-2 font-medium text-green-600">₹{Math.floor(selectedFee.paid_amount)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Balance:</span>
                  <span className={`ml-2 font-medium ${selectedFee.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{Math.floor(selectedFee.balance)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Type <span className="text-red-500">*</span>
              </label>
              <select
                value={adjustmentForm.transaction_type}
                onChange={(e) => setAdjustmentForm({ ...adjustmentForm, transaction_type: e.target.value as 'ADJUSTMENT' | 'REFUND' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="ADJUSTMENT">ADJUSTMENT (Correction)</option>
                <option value="REFUND">REFUND (Money returned)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={adjustmentForm.amount}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amount: e.target.value })}
                  placeholder="e.g., -1800 or 500"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Negative = reduce paid, Positive = increase paid
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={adjustmentForm.reason}
              onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
              placeholder="e.g., Correction for wrong amount entered"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={adjustmentForm.payment_date}
                onChange={(e) => setAdjustmentForm({ ...adjustmentForm, payment_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode (Optional)</label>
              <select
                value={adjustmentForm.payment_mode_id}
                onChange={(e) => setAdjustmentForm({ ...adjustmentForm, payment_mode_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select Payment Mode</option>
                {paymentModes.map(mode => (
                  <option key={mode.payment_mode_id} value={mode.payment_mode_id}>
                    {mode.payment_mode_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea
              value={adjustmentForm.notes}
              onChange={(e) => setAdjustmentForm({ ...adjustmentForm, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Preview */}
          {adjustmentForm.amount && selectedFee && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm font-medium text-blue-800">Preview after adjustment:</p>
              <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-blue-700">
                <div>New Paid Amount: ₹{Math.floor(selectedFee.paid_amount + parseFloat(adjustmentForm.amount || '0'))}</div>
                <div>New Balance: ₹{Math.floor(selectedFee.total_due - (selectedFee.paid_amount + parseFloat(adjustmentForm.amount || '0')))}</div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-4 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => setShowAdjustmentModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleRecordAdjustment}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <MinusCircle className="h-4 w-4 mr-2" />
              Record Adjustment
            </Button>
          </div>
        </div>
      </Modal>

      {/* Floating Action Buttons - Mobile Only */}
      {!showPaymentModal && !showEditFeeModal && !showAdjustmentModal && !showStatsCard && (
        <>
          {/* Left Side: Statistics Button (Orange) */}
          <button
            onClick={() => setShowStatsCard(true)}
            className="fixed bottom-6 left-6 z-40 h-14 w-14 bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600 transition-all hover:scale-110 active:scale-95 flex items-center justify-center md:hidden"
            title="View Statistics"
          >
            <Plus className="h-6 w-6" />
          </button>

          {/* Right Side: Quick Actions Button (Blue) */}
          <button
            onClick={() => {
              // Show first pending fee payment modal if available
              const pendingFee = filteredFees.find(f => f.balance > 0);
              if (pendingFee) {
                handleOpenPaymentModal(pendingFee);
              } else {
                toast.error('No pending fees to record payment');
              }
            }}
            className="fixed bottom-6 right-6 z-40 h-14 w-14 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-all hover:scale-110 active:scale-95 flex items-center justify-center md:hidden"
            title="Quick Payment"
          >
            <Plus className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Floating Statistics Button - Desktop Only */}
      {!showPaymentModal && !showEditFeeModal && !showAdjustmentModal && !showStatsCard && (
        <button
          onClick={() => setShowStatsCard(true)}
          className="hidden md:flex fixed bottom-6 right-6 z-40 h-14 w-14 bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600 transition-all hover:scale-110 active:scale-95 items-center justify-center"
          title="View Statistics"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {/* Statistics Card Modal - Mobile & Desktop */}
      {showStatsCard && (
        <div className="fixed inset-0 z-30">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-30 transition-opacity duration-300"
            onClick={() => setShowStatsCard(false)}
          ></div>

          {/* Bottom Sheet - Mobile Only */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-10 transform transition-transform duration-300 ease-out">
            {/* Drag Handle */}
            <div className="flex justify-center pt-4 pb-2">
              <div className="w-16 h-1.5 bg-gray-300 rounded-full"></div>
            </div>

            {/* Content */}
            <div className="px-6 pb-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Fee Statistics</h3>
                <button
                  onClick={() => setShowStatsCard(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Total Amount */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200 w-full">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-2 font-medium">Total Amount</p>
                      <p className="text-4xl font-bold text-blue-600">₹{Math.floor(totalAmount).toLocaleString('en-IN')}</p>
                    </div>
                    <DollarSign className="h-10 w-10 text-blue-400" />
                  </div>
                </div>

                {/* Pending Amount */}
                <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-6 border-2 border-red-200 w-full">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-2 font-medium">Pending Amount</p>
                      <p className="text-4xl font-bold text-red-600">₹{Math.floor(pendingAmount).toLocaleString('en-IN')}</p>
                    </div>
                    <DollarSign className="h-10 w-10 text-red-400" />
                  </div>
                </div>

                {/* Earned Amount */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200 w-full">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-2 font-medium">Earned Amount</p>
                      <p className="text-4xl font-bold text-green-600">₹{Math.floor(totalAmount - pendingAmount).toLocaleString('en-IN')}</p>
                    </div>
                    <DollarSign className="h-10 w-10 text-green-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Centered Dialog - Desktop Only */}
          <div className="hidden md:flex fixed inset-0 items-center justify-center z-10 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-transform duration-300 ease-out">
              {/* Content */}
              <div className="px-6 py-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">Fee Statistics</h3>
                  <button
                    onClick={() => setShowStatsCard(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-400" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Total Amount */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200 w-full">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-2 font-medium">Total Amount</p>
                        <p className="text-3xl font-bold text-blue-600">₹{Math.floor(totalAmount).toLocaleString('en-IN')}</p>
                      </div>
                      <DollarSign className="h-10 w-10 text-blue-400" />
                    </div>
                  </div>

                  {/* Pending Amount */}
                  <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-6 border-2 border-red-200 w-full">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-2 font-medium">Pending Amount</p>
                        <p className="text-3xl font-bold text-red-600">₹{Math.floor(pendingAmount).toLocaleString('en-IN')}</p>
                      </div>
                      <DollarSign className="h-10 w-10 text-red-400" />
                    </div>
                  </div>

                  {/* Earned Amount */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200 w-full">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-2 font-medium">Earned Amount</p>
                        <p className="text-3xl font-bold text-green-600">₹{Math.floor(totalAmount - pendingAmount).toLocaleString('en-IN')}</p>
                      </div>
                      <DollarSign className="h-10 w-10 text-green-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyFeeManagementPage;
