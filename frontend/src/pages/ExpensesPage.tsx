import React, { useEffect, useState } from 'react';
import { Plus, DollarSign } from 'lucide-react';
import { Card } from '../components/ui/Card';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Expense {
  expense_id: number;
  hostel_id: number;
  hostel_name: string;
  category_id: number;
  category_name: string;
  expense_date: string;
  amount: number;
  payment_mode: string;
  vendor_name: string;
  description: string;
  bill_number: string;
}

interface ExpenseCategory {
  category_id: number;
  category_name: string;
  description: string;
  order_index?: number;
  sort_order?: number;
}

interface ExpenseFormData {
  hostel_id: string;
  category_id: string;
  expense_date: string;
  amount: string;
  payment_mode_id: string;
  vendor_name: string;
  description: string;
  bill_number: string;
}

interface PaymentMode {
  payment_mode_id: number;
  payment_mode_name: string;
  order_index?: number;
}

export const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  // Default to current month in YYYY-MM format
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [formData, setFormData] = useState<ExpenseFormData>({
    hostel_id: '1',
    category_id: '',
    expense_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_mode_id: '',
    vendor_name: '',
    description: '',
    bill_number: ''
  });

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
    fetchPaymentModes();
  }, [selectedMonth]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      // Calculate start and end dates for the selected month
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of the month
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const response = await api.get('/expenses', {
        params: {
          startDate: startDateStr,
          endDate: endDateStr
        }
      });
      setExpenses(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch expenses');
      console.error('Fetch expenses error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/expenses/categories');
      setCategories(response.data.data);
    } catch (error) {
      console.error('Fetch categories error:', error);
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
      category_id: parseInt(formData.category_id),
      expense_date: formData.expense_date,
      amount: parseFloat(formData.amount),
      payment_mode_id: parseInt(formData.payment_mode_id),
      vendor_name: formData.vendor_name || null,
      description: formData.description || null,
      bill_number: formData.bill_number || null
    };

    try {
      if (editingExpense) {
        await api.put(`/expenses/${editingExpense.expense_id}`, payload);
        toast.success('Expense updated successfully');
      } else {
        await api.post('/expenses', payload);
        toast.success('Expense recorded successfully');
      }
      fetchExpenses();
      handleCloseModal();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save expense');
      console.error('Save expense error:', error);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      hostel_id: expense.hostel_id.toString(),
      category_id: expense.category_id.toString(),
      expense_date: expense.expense_date.split('T')[0],
      amount: expense.amount.toString(),
      payment_mode_id: '', // We don't have this in the expense object, user needs to select
      vendor_name: expense.vendor_name || '',
      description: expense.description || '',
      bill_number: expense.bill_number || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (expenseId: number) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;

    try {
      await api.delete(`/expenses/${expenseId}`);
      toast.success('Expense deleted successfully');
      fetchExpenses();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete expense');
      console.error('Delete expense error:', error);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingExpense(null);
    setFormData({
      hostel_id: '1',
      category_id: '',
      expense_date: new Date().toISOString().split('T')[0],
      amount: '',
      payment_mode_id: '',
      vendor_name: '',
      description: '',
      bill_number: ''
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getCategoryColor = (categoryName: string) => {
    const colors: Record<string, string> = {
      'Utilities': 'bg-blue-100 text-blue-800',
      'Maintenance': 'bg-yellow-100 text-yellow-800',
      'Salaries': 'bg-purple-100 text-purple-800',
      'Groceries': 'bg-green-100 text-green-800',
      'Supplies': 'bg-pink-100 text-pink-800',
      'Other': 'bg-gray-100 text-gray-800'
    };
    return colors[categoryName] || 'bg-gray-100 text-gray-800';
  };

  const totalExpenses = expenses.reduce((sum, exp) => {
    const amount = Number(exp.amount) || 0;
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
          <h1 className="text-xl font-bold text-gray-900">Expense Management</h1>
          <p className="text-gray-600">Track and categorize hostel expenses</p>
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
          {/* Total Expenses Card */}
          <Card className="px-3 py-2 bg-white">
            <div className="flex items-center gap-2">
              <span className="text-red-600 text-xs font-semibold">Total Expenses:</span>
              <span className="text-lg font-bold text-red-600">{formatCurrency(totalExpenses)}</span>
            </div>
          </Card>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Expense List */}
      {(
        <div>
          {expenses.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No expenses recorded yet</p>
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
                          Category
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">
                          Payment Mode
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">
                          Vendor
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">
                          Bill Number
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {expenses.map((expense, index) => (
                        <tr key={expense.expense_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                            {index + 1}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                            {formatDate(expense.expense_date)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${getCategoryColor(expense.category_name)}`}>
                              {expense.category_name}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-900 max-w-xs truncate">
                            {expense.description || '-'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs font-semibold text-red-600">
                            {formatCurrency(expense.amount)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                            {expense.payment_mode}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                            {expense.vendor_name || '-'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                            {expense.bill_number || '-'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleEdit(expense)}
                                className="px-3 py-1 bg-blue-600 text-white text-[10px] rounded hover:bg-blue-700 transition-colors"
                                title="Edit"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(expense.expense_id)}
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
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category *
                    </label>
                    <select
                      name="category_id"
                      value={formData.category_id}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Select category</option>
                      {categories.map(cat => (
                        <option key={cat.category_id} value={cat.category_id}>
                          {cat.category_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expense Date *
                    </label>
                    <input
                      type="date"
                      name="expense_date"
                      value={formData.expense_date}
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
                      Vendor Name
                    </label>
                    <input
                      type="text"
                      name="vendor_name"
                      value={formData.vendor_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., ABC Electric Company"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bill Number
                    </label>
                    <input
                      type="text"
                      name="bill_number"
                      value={formData.bill_number}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., INV-2025-001"
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
                      placeholder="Additional details about the expense..."
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
                    {editingExpense ? 'Update Expense' : 'Add Expense'}
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
