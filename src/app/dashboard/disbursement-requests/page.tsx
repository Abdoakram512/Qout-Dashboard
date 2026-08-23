"use client";

import { arabicMatch } from "@/lib/arabicNormalizer";
import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection, query, onSnapshot, doc, updateDoc,
  serverTimestamp, orderBy,
} from "firebase/firestore";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/authContext";
import { ExtraDisbursementRequest } from "@/types";
import {
  ShieldAlert, CheckCircle2, XCircle, Clock, AlertTriangle,
  Search, Filter, Store, CreditCard, UserCheck, Calendar,
  ArrowUpRight, MessageSquare, Check, X, ShieldCheck,
} from "lucide-react";
import Link from "next/link";

function parseDate(raw: any): Date {
  if (!raw) return new Date();
  if (raw.toDate) return raw.toDate();
  if (raw instanceof Date) return raw;
  if (typeof raw === "string") {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  return new Date();
}

export default function DisbursementRequestsPage() {
  const { locale } = useI18n();
  const { adminData } = useAuth();
  const isAr = locale === "ar";

  const [requests, setRequests] = useState<ExtraDisbursementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Reject Modal
  const [rejectingReq, setRejectingReq] = useState<ExtraDisbursementRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    const q = query(
      collection(db, "extra_disbursement_requests"),
      orderBy("timestamp", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: ExtraDisbursementRequest[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as ExtraDisbursementRequest);
        });
        setRequests(list);
        setLoading(false);
      },
      (err) => {
        // Fallback without orderBy if index is creating
        const unsubFallback = onSnapshot(collection(db, "extra_disbursement_requests"), (snap) => {
          const list: ExtraDisbursementRequest[] = [];
          snap.forEach((d) => {
            list.push({ id: d.id, ...d.data() } as ExtraDisbursementRequest);
          });
          list.sort((a, b) => parseDate(b.timestamp).getTime() - parseDate(a.timestamp).getTime());
          setRequests(list);
          setLoading(false);
        });
        return () => unsubFallback();
      }
    );

    return () => unsub();
  }, []);

  // Handle Approve Request
  const handleApprove = async (req: ExtraDisbursementRequest) => {
    setProcessingId(req.id);
    try {
      await updateDoc(doc(db, "extra_disbursement_requests", req.id), {
        status: "approved",
        reviewedBy: {
          adminId: adminData?.uid || "admin",
          adminName: adminData?.name || "مشرف مؤسسة الفجر",
        },
        reviewedAt: serverTimestamp(),
      });
      showToast(`تمت الموافقة واعتماد صرف مبلغ إضافي (${req.requestedAmount?.toLocaleString()} ج.م) بنجاح ✅`);
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء اعتماد الطلب");
    }
    setProcessingId(null);
  };

  // Handle Reject Request
  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingReq) return;
    setProcessingId(rejectingReq.id);

    try {
      await updateDoc(doc(db, "extra_disbursement_requests", rejectingReq.id), {
        status: "rejected",
        rejectionReason: rejectionReason.trim() || "غير مطابق للضوابط الإغاثية",
        reviewedBy: {
          adminId: adminData?.uid || "admin",
          adminName: adminData?.name || "مشرف مؤسسة الفجر",
        },
        reviewedAt: serverTimestamp(),
      });
      showToast("تم رفض الطلب وتوثيق السبب وإشعار الصراف ❌");
      setRejectingReq(null);
      setRejectionReason("");
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء رفض الطلب");
    }
    setProcessingId(null);
  };

  const filteredRequests = requests.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      r.beneficiaryName?.toLowerCase().includes(q) ||
      r.cardId?.toLowerCase().includes(q) ||
      r.merchantStoreName?.toLowerCase().includes(q) ||
      r.reason?.toLowerCase().includes(q);

    const matchStatus = statusFilter === "all" ? true : r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;
  const totalApprovedExtraAmount = requests
    .filter((r) => r.status === "approved")
    .reduce((acc, r) => acc + (r.requestedAmount || 0), 0);

  return (
    <div className="space-y-6 page-enter pb-16">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-[120] px-4 py-3 rounded-2xl bg-[#0A734D] text-white font-black text-sm shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-amber-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #0A734D, #063A28)" }}
          >
            <ShieldAlert className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl lg:text-2xl font-black text-slate-900">
                {isAr ? "طلبات الصرف الاستثنائي والطوارئ" : "Extra Disbursement Requests"}
              </h1>
              {pendingCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                  {pendingCount} {isAr ? "بانتظار المراجعة" : "Pending"}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-semibold">
              {isAr
                ? "مؤسسة الفجر الخيرية | مراجعة واعتماد طلبات المبالغ الإضافية الطارئة المقدمة من الصرافين لحظياً"
                : "Al-Fajr Foundation | Review and authorize emergency extra disbursement requests from merchants in real-time"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Summary KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
        {/* Pending Requests */}
        <div className="qout-card p-4 bg-white border-r-4 border-r-amber-500 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              {isAr ? "الطلبات المعلقة" : "Pending Approval"}
            </p>
            <p className="text-2xl font-black text-amber-700 font-mono mt-0.5">{pendingCount}</p>
            <span className="text-[10px] text-amber-700 font-bold">{isAr ? "تحتاج قرار فوري" : "Requires decision"}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Approved Requests */}
        <div className="qout-card p-4 bg-white border-r-4 border-r-emerald-600 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              {isAr ? "الطلبات المعتمدة" : "Approved Requests"}
            </p>
            <p className="text-2xl font-black text-emerald-800 font-mono mt-0.5">{approvedCount}</p>
            <span className="text-[10px] text-emerald-700 font-bold">{isAr ? "تم الصرف للمستفيد" : "Handed over"}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Total Extra Cash Approved */}
        <div className="qout-card p-4 bg-white border-r-4 border-r-blue-600 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              {isAr ? "إجمالي المبالغ الاستثنائية المعتمدة" : "Total Extra Approved"}
            </p>
            <p className="text-2xl font-black text-blue-900 font-mono mt-0.5">
              {totalApprovedExtraAmount.toLocaleString()} <span className="text-xs text-slate-500 font-bold">{isAr ? "ج.م" : "EGP"}</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        {/* Rejected Requests */}
        <div className="qout-card p-4 bg-white border-r-4 border-r-red-500 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              {isAr ? "الطلبات المرفوضة" : "Rejected Requests"}
            </p>
            <p className="text-2xl font-black text-red-600 font-mono mt-0.5">{rejectedCount}</p>
            <span className="text-[10px] text-slate-400 font-bold">{isAr ? "موثقة بأسباب الرفض" : "Documented"}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 animate-slide-up">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? "بحث برقم الكارت، اسم المستفيد، اسم الصراف، أو سبب الصرف..." : "Search card ID, beneficiary, merchant, reason..."}
            className="qout-input ps-10"
          />
          <Search className="w-4 h-4 absolute start-3.5 top-3 text-slate-400" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(
            [
              { id: "all", labelAr: "الكل", labelEn: "All" },
              { id: "pending", labelAr: `⏳ قيد الانتظار (${pendingCount})`, labelEn: `⏳ Pending (${pendingCount})` },
              { id: "approved", labelAr: "✅ معتمد", labelEn: "Approved" },
              { id: "rejected", labelAr: "❌ مرفوض", labelEn: "Rejected" },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`btn btn-sm ${statusFilter === f.id ? "btn-primary" : "btn-secondary"}`}
            >
              {isAr ? f.labelAr : f.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table / Cards */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-800 text-start">
            <thead className="bg-slate-50/90 text-slate-700 font-extrabold border-b border-slate-200 text-xs">
              <tr>
                <th className="py-3.5 px-4 text-start whitespace-nowrap">{isAr ? "التاريخ والوقت" : "Timestamp"}</th>
                <th className="py-3.5 px-4 text-start whitespace-nowrap">{isAr ? "المنفذ / الصراف" : "Merchant Store"}</th>
                <th className="py-3.5 px-4 text-start whitespace-nowrap">{isAr ? "المستفيد ورقم الكارت" : "Beneficiary & Card"}</th>
                <th className="py-3.5 px-4 text-start whitespace-nowrap">{isAr ? "المبلغ المطلوب" : "Amount"}</th>
                <th className="py-3.5 px-4 text-start whitespace-nowrap">{isAr ? "سبب الصرف الطارئ" : "Urgency Reason"}</th>
                <th className="py-3.5 px-4 text-start whitespace-nowrap">{isAr ? "الحالة" : "Status"}</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">{isAr ? "قرار الإدارة" : "Decision"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 font-bold">
                    {isAr ? "جاري تحميل طلبات الصرف الاستثنائي..." : "Loading requests..."}
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 font-bold">
                    {isAr ? "لا توجد طلبات صرف استثنائي مطابقة" : "No requests found"}
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const date = parseDate(req.timestamp);
                  return (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-slate-600">
                        {date.toLocaleDateString(isAr ? "ar-EG" : "en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      {/* Merchant */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                          <Store className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>{req.merchantStoreName || req.merchantName || "صراف معتمد"}</span>
                        </div>
                      </td>

                      {/* Beneficiary & Card */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <Link
                            href={`/dashboard/beneficiaries/${req.cardId}`}
                            className="font-black text-slate-950 text-xs hover:text-[#0A734D] transition-colors flex items-center gap-1"
                          >
                            <span>{req.beneficiaryName || "مستفيد"}</span>
                            <ArrowUpRight className="w-3 h-3 text-slate-400" />
                          </Link>
                          <span className="font-mono text-[11px] text-slate-500 font-bold">
                            {req.cardId}
                          </span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-black text-base text-[#0A734D]">
                          {(req.requestedAmount || 0).toLocaleString()} <span className="text-xs font-sans text-slate-500 font-bold">{isAr ? "ج.م" : "EGP"}</span>
                        </span>
                      </td>

                      {/* Reason */}
                      <td className="py-3.5 px-4 max-w-xs text-xs text-slate-700 leading-snug">
                        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                          <p className="font-semibold">{req.reason || (isAr ? "حالة طارئة إضافية" : "Emergency need")}</p>
                          {req.rejectionReason && (
                            <p className="text-red-600 font-bold mt-1 text-[11px] border-t border-red-100 pt-1">
                              سبب الرفض: {req.rejectionReason}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black ${
                            req.status === "approved"
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              : req.status === "rejected"
                              ? "bg-red-100 text-red-900 border border-red-300"
                              : "bg-amber-100 text-amber-900 border border-amber-300 animate-pulse"
                          }`}
                        >
                          {req.status === "approved" ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{isAr ? "معتمد" : "Approved"}</span>
                            </>
                          ) : req.status === "rejected" ? (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-red-600" />
                              <span>{isAr ? "مرفوض" : "Rejected"}</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>{isAr ? "بانتظار القرار" : "Pending"}</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {req.status === "pending" ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              disabled={processingId === req.id}
                              onClick={() => handleApprove(req)}
                              className="btn btn-sm bg-[#0A734D] hover:bg-[#085E3E] text-white font-black flex items-center gap-1 px-3 py-1.5 rounded-xl shadow-xs cursor-pointer"
                              title={isAr ? "موافقة واعتماد الصرف" : "Approve"}
                            >
                              <Check className="w-4 h-4" />
                              <span>{isAr ? "موافقة" : "Approve"}</span>
                            </button>

                            <button
                              disabled={processingId === req.id}
                              onClick={() => {
                                setRejectingReq(req);
                                setRejectionReason("");
                              }}
                              className="btn btn-sm bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-black flex items-center gap-1 px-3 py-1.5 rounded-xl cursor-pointer"
                              title={isAr ? "رفض الطلب" : "Reject"}
                            >
                              <X className="w-4 h-4" />
                              <span>{isAr ? "رفض" : "Reject"}</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-bold">
                            {req.reviewedBy?.adminName ? `بواسطة: ${req.reviewedBy.adminName}` : "مكتمل"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: Reject Request with Reason ────────────────────── */}
      {rejectingReq && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border-2 border-slate-200 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setRejectingReq(null)}
              className="absolute top-5 left-5 w-9 h-9 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-950">
                  {isAr ? "رفض طلب الصرف الاستثنائي" : "Reject Request"}
                </h3>
                <p className="text-xs text-slate-500 font-bold">
                  المبلغ: {(rejectingReq.requestedAmount || 0).toLocaleString()} ج.م • كارت: {rejectingReq.cardId}
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? "سبب الرفض (سيظهر للصراف في التطبيق):" : "Rejection Reason:"}
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder={isAr ? "مثال: استنفاد الحد الأقصى الشهري / يرجى التواصل مع الإدارة..." : "State reason for rejection..."}
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={processingId === rejectingReq.id}
                  className="btn bg-red-600 hover:bg-red-700 text-white flex-1 justify-center font-black py-2.5 rounded-xl shadow-md cursor-pointer"
                >
                  {processingId === rejectingReq.id ? "جاري الرفض..." : isAr ? "تأكيد الرفض وإشعار الصراف" : "Confirm Rejection"}
                </button>
                <button
                  type="button"
                  onClick={() => setRejectingReq(null)}
                  className="btn btn-secondary py-2.5 px-4 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
