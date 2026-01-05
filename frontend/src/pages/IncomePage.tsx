import React, { useEffect, useState } from 'react';
import { Plus, TrendingUp } from 'lucide-react';
import { Card } from '../components/ui/Card';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Income {
  income_id: number;
  hostel_id: number;
  hostel_name: string;
  income_date: string;
  amount: number;
  source: string;
  payment_mode: string;
  description: string;
  receipt_number: string;
}

interface IncomeFormData {
  hostel_id: string;
  income_date: string;
  amount: string;
  source: string;
  payment_mode_id: string;
  description: string;
  receipt_number: string;
}

interface PaymentMode {
  payment_mode_id: number;
  payment_mode_name: string;
  order_index?: number;
}

export const IncomePage: React.FC = () => {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  // Default to current month in YYYY-MM format
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [formData, setFormData] = useState<IncomeFormData>({
    hostel_id: '1',
    income_date: new Date().toISOString().split('T')[0],
    amount: '',
    source: '',
    payment_mode_id: '',
    description: '',
    receipt_number: ''
  });

  useEffect(() => {
    fetchIncomes();
    fetchPaymentModes();
  }, [selectedMonth]);

  const fetchIncomes = async () => {
    try {
      setLoading(true);
      // Calculate start and end dates for the selected month
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of the month
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const response = await api.get('/income', {
        params: {
          startDate: startDateStr,
          endDate: endDateStr
        }
      });
      setIncomes(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch income records');
      console.error('Fetch incomes error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentModes = async () => {
    try {
      const response = await api.get('/fees/payment-modes');
      setPaymentModes(response.data.data);
    } catch (error) {
      console.error('Fetch payment modes error:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      hostel_id: parseInt(formData.hostel_id),
      income_date: formData.income_date,
      amount: parseFloat(formData.amount),
      source: formData.source,
      payment_mode_id: parseInt(formData.payment_mode_id),
      description: formData.description || null,
      receipt_number: formData.receipt_number || null
    };

    try {
      if (editingIncome) {
        await api.put(`/income/${editingIncome.income_id}`, payload);
        toast.success('Income updated successfully');
      } else {
        await api.post('/income', payload);
        toast.success('Income recorded successfully');
      }
      fetchIncomes();
      handleCloseModal();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save income');
      console.error('Save income error:', error);
    }
  };

  const handleEdit = (income: Income) => {
    setEditingIncome(income);
    setFormData({
      hostel_id: income.hostel_id.toString(),
      income_date: income.income_date.split('T')[0],
      amount: income.amount.toString(),
      source: income.source,
      payment_mode_id: '', // User needs to select
      description: income.description || '',
      receipt_number: income.receipt_number || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (incomeId: number) => {
    if (!window.confirm('Are you sure you want to delete this income record?')) return;

    try {
      await api.delete(`/income/${incomeId}`);
      toast.success('Income deleted successfully');
      fetchIncomes();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete income');
      console.error('Delete income error:', error);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingIncome(null);
    setFormData({
      hostel_id: '1',
      income_date: new Date().toISOString().split('T')[0],
      amount: '',
      source: '',
      payment_mode_id: '',
      description: '',
      receipt_number: ''
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const totalIncome = incomes.reduce((sum, inc) => {
    const amount = Number(inc.amount) || 0;
    return sum + amount;
  }, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Income Management</h1>
          <p className="text-gray-600">Track and manage hostel income</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Month Picker */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Month:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          {/* Total Income Card */}
          <Card className="px-3 py-2 bg-white">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 text-xs font-semibold">Total Income:</span>
              <span className="text-lg font-bold text-green-600">{formatCurrency(totalIncome)}</span>
            </div>
          </Card>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Income
          </button>
        </div>
      </div>

      {/* Income List */}
      {(
        <div>
          {incomes.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No income records yet</p>
            </div>
          ) : (
            <Card>
              <Card.Body className="p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-primary-600">
                      <tr>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">
                          S.NO
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">
                          Source
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">
                          Payment Mode
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">
                          Receipt Number
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {incomes.map((income, index) => (
                        <tr key={income.income_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                            {index + 1}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                            {formatDate(income.income_date)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                            {income.source}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs font-semibold text-green-600">
                            {formatCurrency(income.amount)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                            {income.payment_mode}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                            {income.receipt_number || '-'}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-900 max-w-xs truncate">
                            {income.description || '-'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleEdit(income)}
                                className="px-3 py-1 bg-blue-600 text-white text-[10px] rounded hover:bg-blue-700 transition-colors"
                                title="Edit"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(income.income_id)}
                                className="px-3 py-1 bg-red-600 text-white text-[10px] rounded hover:bg-red-700 transition-colors"
                                title="Delete"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card.Body>
            </Card>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black opacity-50" onClick={handleCloseModal}></div>

            <div className="relative bg-white rounded-lg max-w-2xl w-full p-6 z-10">
              <h2 className="text-base font-bold text-gray-900 mb-4">
                {editingIncome ? 'Edit Income' : 'Add New Income'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Income Date *
                    </label>
                    <input
                      type="date"
                      name="income_date"
                      value={formData.income_date}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      required
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Source *
                    </label>
                    <input
                      type="text"
                      name="source"
                      value={formData.source}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., Student Fees, Rent, Other"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Mode *
                    </label>
                    <select
                      name="payment_mode_id"
                      value={formData.payment_mode_id}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Select mode</option>
                      {paymentModes.map(mode => (
                        <option key={mode.payment_mode_id} value={mode.payment_mode_id}>
                          {mode.payment_mode_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Receipt Number
                    </label>
                    <input
                      type="text"
                      name="receipt_number"
                      value={formData.receipt_number}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., RCP-2025-001"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Additional details about the income..."
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    {editingIncome ? 'Update Income' : 'Add Income'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
