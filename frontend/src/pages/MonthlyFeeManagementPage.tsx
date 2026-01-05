import React, { useEffect, useState } from 'react';
import { Plus, Edit, Calendar, AlertCircle, MinusCircle } from 'lucide-react';
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

interface FeePayment {
  payment_id: number;
  fee_id: number | null;
  student_id: number;
  hostel_id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  payment_mode_id: number | null;
  transaction_type: 'PAYMENT' | 'ADJUSTMENT' | 'REFUND';
  transaction_id: string | null;
  receipt_number: string | null;
  notes: string | null;
  reason: string | null;
  fee_month: string | null;
  created_at: string;
  updated_at: string;
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
  const [feePayments, setFeePayments] = useState<FeePayment[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'FULLY_PAID' | 'PARTIALLY_PAID' | 'PENDING'>('ALL');

  // Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditFeeModal, setShowEditFeeModal] = useState(false);
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
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

  const handleFetchPaymentHistory = async (fee: MonthlyFee) => {
    setSelectedFee(fee);

    try {
      // Fetch all payments for this student (across all months)
      const response = await api.get(`/monthly-fees/student/${fee.student_id}/payments`);
      setFeePayments(response.data.data || []);
      setShowPaymentHistoryModal(true);
    } catch (error) {
      console.error('Fetch payments error:', error);
      setFeePayments([]);
      setShowPaymentHistoryModal(true);
    }
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

  const handleOpenEditFeeModal = (fee: MonthlyFee) => {
    // If fee_id is null, we need to create the fee record first
    if (!fee.fee_id) {
      toast.error('Fee record does not exist. Please create it first.');
      return;
    }

    setSelectedFee(fee);
    setEditFeeForm({
      monthly_rent: fee.monthly_rent.toString(),
      carry_forward: fee.carry_forward.toString(),
      due_date: fee.due_date || '',
      notes: fee.notes || ''
    });
    setShowEditFeeModal(true);
  };

  const handleOpenAdjustmentModal = () => {
    if (!selectedFee?.fee_id) {
      toast.error('Fee record does not exist. Cannot add adjustment.');
      return;
    }
    setAdjustmentForm({
      amount: '',
      transaction_type: 'ADJUSTMENT',
      reason: '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode_id: '',
      notes: ''
    });
    setShowAdjustmentModal(true);
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

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'PAYMENT':
        return 'bg-green-100 text-green-800';
      case 'ADJUSTMENT':
        return 'bg-orange-100 text-orange-800';
      case 'REFUND':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Monthly Fee Management
          </h1>
          <p className="text-sm text-gray-600">
            Manage and track student fees by month
          </p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-4">
          <input
            type="month"
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white shadow-sm"
          />
        </div>
      </div>

      {/* Filter Dropdown and Summary Cards */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'FULLY_PAID' | 'PARTIALLY_PAID' | 'PENDING')}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
          >
            <option value="ALL">All</option>
            <option value="FULLY_PAID">Fully Paid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>

        {/* Summary Cards - Inline Format */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-700 font-medium">Total Amount</span>
          <span className="text-gray-900 font-bold">
            ₹{Math.floor(fees
              .filter((fee) => {
                if (statusFilter === 'ALL') return true;
                const statusMap: Record<string, string> = {
                  'FULLY_PAID': 'Fully Paid',
                  'PARTIALLY_PAID': 'Partially Paid',
                  'PENDING': 'Pending'
                };
                return fee.fee_status === statusMap[statusFilter];
              })
              .reduce((sum, fee) => sum + (fee.total_due || 0), 0))
              .toLocaleString('en-IN')}
          </span>
          <span className="text-gray-400">|</span>
          <span className="text-red-600 font-medium">Pending Amount</span>
          <span className="text-red-600 font-bold">
            ₹{Math.floor(fees
              .filter((fee) => {
                if (statusFilter === 'ALL') return true;
                const statusMap: Record<string, string> = {
                  'FULLY_PAID': 'Fully Paid',
                  'PARTIALLY_PAID': 'Partially Paid',
                  'PENDING': 'Pending'
                };
                return fee.fee_status === statusMap[statusFilter];
              })
              .reduce((sum, fee) => sum + (fee.balance || 0), 0))
              .toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Fees Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
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
                {fees
                  .filter((fee) => {
                    if (statusFilter === 'ALL') return true;
                    const statusMap: Record<string, string> = {
                      'FULLY_PAID': 'Fully Paid',
                      'PARTIALLY_PAID': 'Partially Paid',
                      'PENDING': 'Pending'
                    };
                    return fee.fee_status === statusMap[statusFilter];
                  })
                  .map((fee, index) => (
                  <tr
                    key={fee.fee_id || fee.student_id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleFetchPaymentHistory(fee)}
                  >
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                      {index + 1}
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

        {fees.filter((fee) => {
          if (statusFilter === 'ALL') return true;
          const statusMap: Record<string, string> = {
            'FULLY_PAID': 'Fully Paid',
            'PARTIALLY_PAID': 'Partially Paid',
            'PENDING': 'Pending'
          };
          return fee.fee_status === statusMap[statusFilter];
        }).length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {statusFilter === 'ALL'
                ? `No active students found for ${currentMonth}. All active students with rooms will appear here automatically.`
                : `No students found with status "${statusFilter === 'FULLY_PAID' ? 'Fully Paid' : statusFilter === 'PARTIALLY_PAID' ? 'Partially Paid' : 'Pending'}" for ${currentMonth}.`}
            </p>
          </div>
        )}

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">
              {fees.filter((fee) => {
                if (statusFilter === 'ALL') return true;
                const statusMap: Record<string, string> = {
                  'FULLY_PAID': 'Fully Paid',
                  'PARTIALLY_PAID': 'Partially Paid',
                  'PENDING': 'Pending'
                };
                return fee.fee_status === statusMap[statusFilter];
              }).length}
            </span> student{fees.filter((fee) => {
              if (statusFilter === 'ALL') return true;
              const statusMap: Record<string, string> = {
                'FULLY_PAID': 'Fully Paid',
                'PARTIALLY_PAID': 'Partially Paid',
                'PENDING': 'Pending'
              };
              return fee.fee_status === statusMap[statusFilter];
            }).length !== 1 ? 's' : ''}
            {statusFilter !== 'ALL' && ` (${statusFilter === 'FULLY_PAID' ? 'Fully Paid' : statusFilter === 'PARTIALLY_PAID' ? 'Partially Paid' : 'Pending'})`}
          </p>
        </div>
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

      {/* Payment History Modal */}
      <Modal
        isOpen={showPaymentHistoryModal}
        onClose={() => setShowPaymentHistoryModal(false)}
        title={`Fee Details - ${selectedFee?.first_name} ${selectedFee?.last_name}`}
      >
        <div className="space-y-4">
          {/* Fee Summary */}
          {selectedFee && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 border-b pb-2">
                Fee Summary - {selectedFee.fee_month}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500">Room</label>
                  <p className="text-sm text-gray-900">{selectedFee.room_number || '-'} (Floor {selectedFee.floor_number || '-'})</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Phone</label>
                  <p className="text-sm text-gray-900">{selectedFee.phone}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Monthly Rent</label>
                  <p className="text-sm text-gray-900">₹{Math.floor(selectedFee.monthly_rent)}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Carry Forward</label>
                  <p className="text-sm text-gray-900">₹{Math.floor(selectedFee.carry_forward)}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Total Due</label>
                  <p className="text-sm font-medium text-gray-900">₹{Math.floor(selectedFee.total_due)}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Paid Amount</label>
                  <p className="text-sm text-green-600">₹{Math.floor(selectedFee.paid_amount)}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Balance</label>
                  <p className={`text-sm font-medium ${selectedFee.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{Math.floor(selectedFee.balance)}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Status</label>
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${getStatusColor(selectedFee.fee_status)}`}>
                    {selectedFee.fee_status}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Transaction History */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-gray-900">All Payment History</h3>
              {selectedFee?.fee_id && (
                <button
                  onClick={handleOpenAdjustmentModal}
                  className="flex items-center text-xs px-2 py-1 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                >
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Add Adjustment
                </button>
              )}
            </div>
            {feePayments.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {(() => {
                  // Group payments by month
                  const groupedPayments: { [key: string]: FeePayment[] } = {};
                  feePayments.forEach((payment) => {
                    // Use fee_month if available, otherwise derive from payment_date
                    const monthKey = payment.fee_month || 
                      `${new Date(payment.payment_date).getFullYear()}-${String(new Date(payment.payment_date).getMonth() + 1).padStart(2, '0')}`;
                    if (!groupedPayments[monthKey]) {
                      groupedPayments[monthKey] = [];
                    }
                    groupedPayments[monthKey].push(payment);
                  });

                  // Sort months in descending order (newest first)
                  const sortedMonths = Object.keys(groupedPayments).sort((a, b) => b.localeCompare(a));

                  // Month color mapping for visual indicators
                  const monthColors = [
                    'bg-blue-50 border-blue-200 text-blue-700',
                    'bg-green-50 border-green-200 text-green-700',
                    'bg-purple-50 border-purple-200 text-purple-700',
                    'bg-yellow-50 border-yellow-200 text-yellow-700',
                    'bg-pink-50 border-pink-200 text-pink-700',
                    'bg-indigo-50 border-indigo-200 text-indigo-700',
                  ];

                  const formatMonth = (monthStr: string) => {
                    const [year, month] = monthStr.split('-');
                    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
                    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                  };

                  return sortedMonths.map((monthKey, monthIndex) => {
                    const payments = groupedPayments[monthKey];
                    const colorClass = monthColors[monthIndex % monthColors.length];
                    
                    return (
                      <div key={monthKey} className="space-y-2">
                        {/* Month Header */}
                        <div className={`sticky top-0 z-10 px-3 py-2 rounded-lg border ${colorClass} shadow-sm`}>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm">{formatMonth(monthKey)}</span>
                            <span className="text-xs font-medium opacity-75">
                              {payments.length} {payments.length === 1 ? 'payment' : 'payments'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Payments for this month */}
                        <div className="space-y-2 pl-2">
                          {payments.map((payment) => (
                            <div
                              key={payment.payment_id}
                              className={`p-3 rounded-lg border ${
                                payment.transaction_type === 'REFUND' ? 'border-red-200 bg-red-50' :
                                payment.transaction_type === 'ADJUSTMENT' ? 'border-orange-200 bg-orange-50' :
                                'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`font-medium text-sm ${payment.amount < 0 ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'}`}>
                                      {payment.amount < 0 ? '-' : '+'}₹{Math.abs(Math.floor(payment.amount))}
                                    </span>
                                    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${getTransactionTypeColor(payment.transaction_type || 'PAYMENT')}`}>
                                      {payment.transaction_type || 'PAYMENT'}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 flex items-center gap-2 flex-wrap">
                                    <span className="flex items-center">
                                      <Calendar size={12} className="inline mr-1" />
                                      {new Date(payment.payment_date).toLocaleDateString('en-US', { 
                                        day: 'numeric', 
                                        month: 'short', 
                                        year: 'numeric' 
                                      })}
                                    </span>
                                    {payment.payment_method && (
                                      <span className="text-gray-500">• {payment.payment_method}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right ml-3">
                                  {payment.receipt_number && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                      #{payment.receipt_number}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {payment.reason && (
                                <div className="text-xs text-orange-700 dark:text-orange-400 mt-2 pt-2 border-t border-orange-200 dark:border-orange-800">
                                  <strong>Reason:</strong> {payment.reason}
                                </div>
                              )}
                              {payment.notes && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{payment.notes}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 py-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                No transactions recorded yet
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => {
                setShowPaymentHistoryModal(false);
                if (selectedFee) handleOpenPaymentModal(selectedFee);
              }}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Record Payment
            </button>
            {selectedFee?.fee_id && (
              <button
                onClick={() => {
                  setShowPaymentHistoryModal(false);
                  if (selectedFee) handleOpenEditFeeModal(selectedFee);
                }}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Fee
              </button>
            )}
          </div>
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
    </div>
  );
};

export default MonthlyFeeManagementPage;
