import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertCircle, Calendar } from "lucide-react";
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

  useEffect(() => {
    fetchPaymentHistory();
  }, [studentId, feeMonth]);

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
          <div className="space-y-4">
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
        ) : (
          <div className="text-center py-12 text-gray-500">
            <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-base">No payment history recorded yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeeDetailsPage;
