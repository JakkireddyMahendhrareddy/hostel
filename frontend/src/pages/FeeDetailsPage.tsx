import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertCircle, Calendar, Edit2, Trash2, X } from "lucide-react";
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
  transaction_type?: "PAYMENT" | "ADJUSTMENT" | "REFUND";
  reason?: string | null;
  fee_month?: string | null;
}

interface PaymentMode {
  payment_mode_id: number;
  payment_mode_name: string;
  order_index?: number;
}

interface EditFormData {
  amount: string;
  payment_date: string;
  payment_mode_id: string;
  receipt_number: string;
  transaction_id: string;
  notes: string;
}

const getTransactionTypeColor = (type: string) => {
  switch (type) {
    case "PAYMENT":
      return "bg-green-100 text-green-800";
    case "ADJUSTMENT":
      return "bg-orange-100 text-orange-800";
    case "REFUND":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const FeeDetailsPage: React.FC = () => {
  const { studentId, feeMonth } = useParams();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Edit modal state
  const [editModal, setEditModal] = useState({
    open: false,
    payment: null as FeePayment | null,
  });
  const [editForm, setEditForm] = useState<EditFormData>({
    amount: "",
    payment_date: "",
    payment_mode_id: "",
    receipt_number: "",
    transaction_id: "",
    notes: "",
  });

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    paymentId: null as number | null,
  });

  useEffect(() => {
    fetchPaymentHistory();
    fetchPaymentModes();
  }, [studentId, feeMonth]);

  const fetchPaymentModes = async () => {
    try {
      const response = await api.get("/payment-modes");
      setPaymentModes(response.data.data || []);
    } catch (error) {
      console.error("Error fetching payment modes:", error);
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

  const handleEditOpen = (payment: FeePayment) => {
    setEditForm({
      amount: payment.amount.toString(),
      payment_date: payment.payment_date.split("T")[0],
      payment_mode_id: payment.payment_mode_id?.toString() || "",
      receipt_number: payment.receipt_number || "",
      transaction_id: payment.transaction_id || "",
      notes: payment.notes || "",
    });
    setEditModal({ open: true, payment });
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

  const handleEditFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditSubmit = async () => {
    if (!editModal.payment) return;

    if (!editForm.amount || !editForm.payment_date) {
      toast.error("Amount and payment date are required");
      return;
    }

    try {
      setEditLoading(true);
      await api.put(`/monthly-fees/payments/${editModal.payment.payment_id}`, {
        amount: parseFloat(editForm.amount),
        payment_date: editForm.payment_date,
        payment_mode_id: editForm.payment_mode_id
          ? parseInt(editForm.payment_mode_id)
          : null,
        receipt_number: editForm.receipt_number || null,
        transaction_id: editForm.transaction_id || null,
        notes: editForm.notes || null,
      });

      toast.success("Payment updated successfully");
      handleEditCancel();
      await fetchPaymentHistory();
    } catch (error: any) {
      console.error("Edit error:", error);
      toast.error(error?.response?.data?.error || "Failed to update payment");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteOpen = (paymentId: number) => {
    setDeleteConfirm({ open: true, paymentId });
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ open: false, paymentId: null });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.paymentId) return;

    try {
      setDeleteLoading(true);
      await api.delete(`/monthly-fees/payments/${deleteConfirm.paymentId}`);
      toast.success("Payment deleted successfully");
      handleDeleteCancel();
      await fetchPaymentHistory();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error?.response?.data?.error || "Failed to delete payment");
    } finally {
      setDeleteLoading(false);
    }
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
            All Past Payment History
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 py-4">
        {payments.length > 0 ? (
          <>
            {/* Mobile Card View */}
            <div className="block md:hidden space-y-4">
              {(() => {
                // Group payments by month
                const groupedPayments: { [key: string]: FeePayment[] } = {};
                payments.forEach((payment) => {
                  // Use fee_month if available, otherwise derive from payment_date
                  const monthKey =
                    payment.fee_month ||
                    `${new Date(payment.payment_date).getFullYear()}-${String(
                      new Date(payment.payment_date).getMonth() + 1
                    ).padStart(2, "0")}`;
                  if (!groupedPayments[monthKey]) {
                    groupedPayments[monthKey] = [];
                  }
                  groupedPayments[monthKey].push(payment);
                });

                // Sort months in descending order (newest first)
                const sortedMonths = Object.keys(groupedPayments).sort(
                  (a, b) => b.localeCompare(a)
                );

                // Month color mapping for visual indicators
                const monthColors = [
                  "bg-blue-50 border-blue-200 text-blue-700",
                  "bg-green-50 border-green-200 text-green-700",
                  "bg-purple-50 border-purple-200 text-purple-700",
                  "bg-yellow-50 border-yellow-200 text-yellow-700",
                  "bg-pink-50 border-pink-200 text-pink-700",
                  "bg-indigo-50 border-indigo-200 text-indigo-700",
                ];

                const formatMonth = (monthStr: string) => {
                  const [year, month] = monthStr.split("-");
                  const date = new Date(
                    parseInt(year),
                    parseInt(month) - 1,
                    1
                  );
                  return date.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  });
                };

                return sortedMonths.map((monthKey, monthIndex) => {
                  const monthPayments = groupedPayments[monthKey];
                  const colorClass =
                    monthColors[monthIndex % monthColors.length];

                  return (
                    <div key={monthKey} className="space-y-2">
                      {/* Month Header */}
                      <div
                        className={`sticky top-12 z-10 px-4 py-3 rounded-lg border ${colorClass} shadow-sm`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm">
                            {formatMonth(monthKey)}
                          </span>
                          <span className="text-xs font-medium opacity-75">
                            {monthPayments.length}{" "}
                            {monthPayments.length === 1 ? "payment" : "payments"}
                          </span>
                        </div>
                      </div>

                      {/* Payments for this month */}
                      <div className="space-y-2">
                        {monthPayments.map((payment) => (
                          <div
                            key={payment.payment_id}
                            className={`p-4 rounded-lg border ${
                              payment.transaction_type === "REFUND"
                                ? "border-red-200 bg-red-50"
                                : payment.transaction_type === "ADJUSTMENT"
                                ? "border-orange-200 bg-orange-50"
                                : "border-gray-200 bg-white"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                  <span
                                    className={`font-semibold text-base ${
                                      payment.amount < 0
                                        ? "text-red-600"
                                        : "text-green-600"
                                    }`}
                                  >
                                    {payment.amount < 0 ? "-" : "+"}₹
                                    {Math.abs(Math.floor(payment.amount)).toLocaleString(
                                      "en-IN"
                                    )}
                                  </span>
                                  <span
                                    className={`px-2 py-1 text-xs font-medium rounded ${getTransactionTypeColor(
                                      payment.transaction_type || "PAYMENT"
                                    )}`}
                                  >
                                    {payment.transaction_type || "PAYMENT"}
                                  </span>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2 mb-2">
                                  <button
                                    onClick={() => handleEditOpen(payment)}
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition"
                                  >
                                    <Edit2 size={14} />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteOpen(payment.payment_id)}
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition"
                                  >
                                    <Trash2 size={14} />
                                    Delete
                                  </button>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Calendar size={14} />
                                    <span>
                                      {new Date(
                                        payment.payment_date
                                      ).toLocaleDateString("en-IN", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                      })}
                                    </span>
                                  </div>

                                  {payment.payment_method && (
                                    <div className="text-sm text-gray-600">
                                      <strong>Method:</strong> {payment.payment_method}
                                    </div>
                                  )}

                                  {payment.receipt_number && (
                                    <div className="text-sm text-gray-600">
                                      <strong>Receipt:</strong> #{payment.receipt_number}
                                    </div>
                                  )}

                                  {payment.transaction_id && (
                                    <div className="text-sm text-gray-600">
                                      <strong>Transaction ID:</strong> {payment.transaction_id}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {payment.reason && (
                              <div className="mt-3 pt-3 border-t border-orange-200 text-sm">
                                <p className="text-orange-700">
                                  <strong>Reason:</strong> {payment.reason}
                                </p>
                              </div>
                            )}

                            {payment.notes && (
                              <div className="mt-2 text-sm text-gray-600">
                                <p><strong>Notes:</strong> {payment.notes}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block">
              <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
                <table className="w-full">
                  <thead className="bg-primary-600">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Method</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Receipt #</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Transaction ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Notes</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {payments.map((payment) => (
                      <tr key={payment.payment_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-800">
                          {new Date(payment.payment_date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-right">
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
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`inline-block px-2.5 py-1 text-xs font-medium rounded ${getTransactionTypeColor(
                              payment.transaction_type || "PAYMENT"
                            )}`}
                          >
                            {payment.transaction_type || "PAYMENT"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {payment.payment_method || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {payment.receipt_number ? `#${payment.receipt_number}` : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                          {payment.transaction_id || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                          {payment.notes || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditOpen(payment)}
                              className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                              title="Edit payment"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteOpen(payment.payment_id)}
                              className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                              title="Delete payment"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition disabled:opacity-50"
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeDetailsPage;
