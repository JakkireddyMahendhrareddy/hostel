import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertCircle, Edit2, Trash2, X, ChevronDown, ChevronUp } from "lucide-react";
import api from "../services/api";
import toast from "react-hot-toast";

interface FeePayment {
  payment_id: number;
  fee_id: number | null;
  student_id: number;
  hostel_id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  payment_mode_id: number | null;
  transaction_id: string | null;
  receipt_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface PaymentMode {
  payment_mode_id: number;
  payment_mode_name: string;
  order_index?: number;
}

interface EditPaymentFormData {
  amount: string;
  payment_date: string;
  payment_mode_id: string;
  receipt_number: string;
  transaction_id: string;
  notes: string;
}

export const FeeDetailsPage: React.FC = () => {
  const { studentId, feeMonth } = useParams();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    paymentId: number | null;
  }>({ open: false, paymentId: null });
  const [editModal, setEditModal] = useState<{
    open: boolean;
    payment: FeePayment | null;
  }>({ open: false, payment: null });
  const [editForm, setEditForm] = useState<EditPaymentFormData>({
    amount: "",
    payment_date: "",
    payment_mode_id: "",
    receipt_number: "",
    transaction_id: "",
    notes: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [expandedPaymentId, setExpandedPaymentId] = useState<number | null>(null);

  useEffect(() => {
    fetchPaymentHistory();
    fetchPaymentModes();
  }, [studentId, feeMonth]);

  const fetchPaymentModes = async () => {
    try {
      const response = await api.get("/fees/payment-modes");
      setPaymentModes(response.data.data || []);
    } catch (error) {
      console.error("Fetch payment modes error:", error);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);

      // Validate parameters
      if (!studentId || !feeMonth) {
        toast.error("Invalid payment history");
        navigate("/owner/monthly-fees");
        return;
      }

      // Fetch payment history - ensure studentId is treated as a number
      const sid = parseInt(studentId, 10);
      if (isNaN(sid)) {
        toast.error("Invalid student ID");
        navigate("/owner/monthly-fees");
        return;
      }

      // Fetch all payments for this student
      const paymentsResponse = await api.get(
        `/monthly-fees/student/${sid}/payments`
      );
      const allPayments = paymentsResponse.data.data || [];

      // Filter payments: show only payments from the selected month and earlier
      // This ensures "past history" - all payments up to and including the selected month
      const targetDate = new Date(`${feeMonth}-01`);
      targetDate.setMonth(targetDate.getMonth() + 1); // End of the selected month

      const filteredPayments = allPayments.filter((payment: FeePayment) => {
        const paymentDate = new Date(payment.payment_date);
        return paymentDate <= targetDate;
      });

      // Sort by payment date descending (newest first)
      filteredPayments.sort(
        (a: FeePayment, b: FeePayment) =>
          new Date(b.payment_date).getTime() -
          new Date(a.payment_date).getTime()
      );

      setPayments(filteredPayments);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load payment history");
      navigate("/owner/monthly-fees");
    } finally {
      setLoading(false);
    }
  };

  const handleEditPayment = (payment: FeePayment) => {
    // Convert payment_date to YYYY-MM-DD format for date input (handle timezone)
    const paymentDate = new Date(payment.payment_date);
    const year = paymentDate.getFullYear();
    const month = String(paymentDate.getMonth() + 1).padStart(2, "0");
    const day = String(paymentDate.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;

    setEditForm({
      amount: payment.amount.toString(),
      payment_date: formattedDate,
      payment_mode_id: payment.payment_mode_id?.toString() || "",
      receipt_number: payment.receipt_number || "",
      transaction_id: payment.transaction_id || "",
      notes: payment.notes || "",
    });
    setEditModal({ open: true, payment });
  };

  const handleEditFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditSubmit = async () => {
    if (!editModal.payment) return;

    // Validate required fields
    if (!editForm.amount || !editForm.payment_date || !editForm.payment_mode_id) {
      toast.error("Amount, Payment Date, and Payment Mode are required");
      return;
    }

    // Validate amount is positive number
    const amount = parseFloat(editForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Amount must be a positive number");
      return;
    }

    // Validate payment date is not in future
    // Parse YYYY-MM-DD string to avoid timezone issues
    const [year, month, day] = editForm.payment_date.split('-').map(Number);
    const paymentDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    paymentDate.setHours(0, 0, 0, 0);
    if (paymentDate > today) {
      toast.error("Payment date cannot be in the future");
      return;
    }

    try {
      setEditLoading(true);

      const updateData = {
        amount: amount,
        payment_date: editForm.payment_date,
        payment_mode_id: parseInt(editForm.payment_mode_id, 10),
        receipt_number: editForm.receipt_number || null,
        transaction_id: editForm.transaction_id || null,
        notes: editForm.notes || null,
      };

      await api.put(
        `/monthly-fees/payment/${editModal.payment.payment_id}`,
        updateData
      );

      toast.success("Payment updated successfully");
      setEditModal({ open: false, payment: null });
      fetchPaymentHistory();
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update payment");
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditCancel = () => {
    setEditModal({ open: false, payment: null });
    setEditForm({
      amount: "",
      payment_date: "",
      payment_mode_id: "",
      receipt_number: "",
      transaction_id: "",
      notes: "",
    });
  };

  const handleDeleteClick = (paymentId: number) => {
    setDeleteConfirm({ open: true, paymentId });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.paymentId) return;

    try {
      await api.delete(`/monthly-fees/payment/${deleteConfirm.paymentId}`);
      toast.success("Payment deleted successfully");
      setDeleteConfirm({ open: false, paymentId: null });
      fetchPaymentHistory();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete payment");
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ open: false, paymentId: null });
  };

  // Pagination logic
  const totalPages = Math.ceil(payments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayments = payments.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header - Fixed */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2 px-4 py-3">
          <button
            onClick={() => navigate("/owner/monthly-fees")}
            className="p-1 rounded-md hover:bg-gray-100 transition"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold text-blue-800">
            Payment History
          </h1>
        </div>
      </div>

      {/* Main Content - Desktop Table View */}
      <div className="hidden md:block px-4 py-4">
        {payments.length > 0 ? (
          <>
            <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
              <table className="w-full">
                <thead className="bg-primary-600">
                  <tr>
                    <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">S.NO</th>
                    <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">DATE</th>
                    <th className="px-3 py-2 text-right text-[10px] font-medium text-white uppercase tracking-wider">AMOUNT</th>
                    <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">PAYMENT METHOD</th>
                    <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">RECEIPT</th>
                    <th className="px-3 py-2 text-left text-[10px] font-medium text-white uppercase tracking-wider">NOTES</th>
                    <th className="px-3 py-2 text-center text-[10px] font-medium text-white uppercase tracking-wider">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPayments.map((payment, index) => (
                  <tr
                    key={payment.payment_id}
                    className="border-b border-gray-200 text-[13px]"
                  >
                    <td className="px-3 py-2 text-gray-800 font-semibold text-center">
                      {index + 1}
                    </td>
                    <td className="px-3 py-2 text-gray-800">
                      {new Date(payment.payment_date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">
                      <span
                        className={
                          payment.amount < 0 ? "text-red-600" : "text-green-600"
                        }
                      >
                        {payment.amount < 0 ? "-" : "+"}₹
                        {Math.abs(Math.floor(payment.amount)).toLocaleString(
                          "en-IN"
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {payment.payment_method || "-"}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {payment.receipt_number ? `#${payment.receipt_number}` : "-"}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {payment.notes || "-"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEditPayment(payment)}
                          className="p-1 text-blue-600 hover:text-blue-700 transition"
                          title="Edit payment"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(payment.payment_id)}
                          className="p-1 text-red-600 hover:text-red-700 transition"
                          title="Delete payment"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>

            {/* Pagination Controls - Desktop */}
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                {/* Left: Total Payments Info */}
                <div className="text-sm text-gray-600">
                  Showing <span className="font-semibold text-gray-900">{startIndex + 1}</span> to <span className="font-semibold text-gray-900">{Math.min(endIndex, payments.length)}</span> of <span className="font-semibold text-gray-900">{payments.length}</span> payments
                </div>

                {/* Right: Pagination Controls */}
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
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        currentPage === page
                          ? "bg-primary-600 text-white border border-primary-600"
                          : "bg-white text-gray-700 border border-gray-300 hover:border-primary-600 hover:text-primary-600"
                      }`}
                    >
                      {page}
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
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-base">No payment history recorded yet</p>
          </div>
        )}
      </div>

      {/* Main Content - Mobile Card View */}
      <div className="md:hidden px-4 py-4 space-y-3">
        {payments.length > 0 ? (
          payments.map((payment, index) => {
            const isExpanded = expandedPaymentId === payment.payment_id;
            return (
              <div key={payment.payment_id} className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all">
                {/* Card Header - Collapsed View */}
                <div
                  className="p-3 cursor-pointer flex items-center justify-between"
                  onClick={() => setExpandedPaymentId(isExpanded ? null : payment.payment_id)}
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
                      <span className="text-xs font-semibold text-gray-500 uppercase block">Payment #{index + 1}</span>
                      <p className="text-xs text-gray-700 font-medium">
                        {new Date(payment.payment_date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-bold flex-shrink-0 ${
                      payment.amount < 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {payment.amount < 0 ? "-" : "+"}₹
                    {Math.abs(Math.floor(payment.amount)).toLocaleString("en-IN")}
                  </span>
                </div>

                {/* Card Details - Expanded View */}
                {isExpanded && (
                  <div className="pt-3 pb-3 px-3 border-t border-gray-100 space-y-3">
                    {/* Payment Method */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Payment Method</p>
                      <p className="text-sm font-medium text-gray-800">{payment.payment_method || "-"}</p>
                    </div>

                    {/* Receipt */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Receipt</p>
                      <p className="text-sm font-medium text-gray-800">
                        {payment.receipt_number ? `#${payment.receipt_number}` : "-"}
                      </p>
                    </div>

                    {/* Transaction ID */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Transaction ID</p>
                      <p className="text-sm font-medium text-gray-800">{payment.transaction_id || "-"}</p>
                    </div>

                    {/* Notes */}
                    {payment.notes && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Notes</p>
                        <p className="text-sm font-medium text-gray-800">{payment.notes}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => {
                          setExpandedPaymentId(null);
                          handleEditPayment(payment);
                        }}
                        className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                        title="Edit payment"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setExpandedPaymentId(null);
                          handleDeleteClick(payment.payment_id);
                        }}
                        className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                        title="Delete payment"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-gray-500">
            <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-base">No payment history recorded yet</p>
          </div>
        )}
      </div>

      {/* Edit Payment Modal */}
      {editModal.open && editModal.payment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Edit Payment</h2>
              <button
                onClick={handleEditCancel}
                className="p-1 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-4 space-y-3">
              {/* Row 1: Amount and Payment Date */}
              <div className="grid grid-cols-2 gap-4">
                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={editForm.amount}
                    onChange={handleEditFormChange}
                    placeholder="Enter amount"
                    step="1"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Payment Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="payment_date"
                    value={editForm.payment_date}
                    onChange={handleEditFormChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Row 2: Payment Mode and Receipt Number */}
              <div className="grid grid-cols-2 gap-4">
                {/* Payment Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Mode <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="payment_mode_id"
                    value={editForm.payment_mode_id}
                    onChange={handleEditFormChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select payment mode</option>
                    {paymentModes.map((mode) => (
                      <option key={mode.payment_mode_id} value={mode.payment_mode_id}>
                        {mode.payment_mode_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Receipt Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Receipt Number
                  </label>
                  <input
                    type="text"
                    name="receipt_number"
                    value={editForm.receipt_number}
                    onChange={handleEditFormChange}
                    placeholder="RCP001"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Row 3: Transaction ID (Full Width) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transaction ID
                </label>
                <input
                  type="text"
                  name="transaction_id"
                  value={editForm.transaction_id}
                  onChange={handleEditFormChange}
                  placeholder="TXN123456"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Row 4: Notes (Full Width) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={editForm.notes}
                  onChange={handleEditFormChange}
                  placeholder="Add any notes..."
                  rows={1}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 px-6 py-3 flex gap-3 justify-end bg-gray-50">
              <button
                onClick={handleEditCancel}
                disabled={editLoading}
                className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={editLoading}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition disabled:opacity-50 flex items-center gap-2"
              >
                {editLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  "Update Payment"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="text-red-600" size={24} />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Delete Payment</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this payment? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
