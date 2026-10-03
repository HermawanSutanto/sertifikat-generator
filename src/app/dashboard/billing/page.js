"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { SUBSCRIPTION_PLANS } from "@/lib/doku";

// ─── Ikon ────────────────────────────────────────────────────────────────────

const IconCheck = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const IconCrown = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
  </svg>
);

const IconArrowLeft = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const IconReceipt = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
);

// ─── Utilitas ─────────────────────────────────────────────────────────────────

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(isoString) {
  if (!isoString) return "-";
  return new Date(isoString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const STATUS_STYLE = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  failed: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_LABEL = {
  success: "Berhasil",
  pending: "Menunggu",
  failed: "Gagal",
};

// ─── Komponen Halaman ─────────────────────────────────────────────────────────

function BillingContent() {
  const { user, loading, userData, isPremium } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL param dari callback DOKU
  const callbackStatus = searchParams.get("status"); // "success" | null
  const callbackOrderId = searchParams.get("orderId");
  const isMockReturn = searchParams.get("mock") === "1";

  const [transactions, setTransactions] = useState([]);
  const [isTxLoading, setIsTxLoading] = useState(true);
  const [txError, setTxError] = useState(null);

  const [checkoutLoading, setCheckoutLoading] = useState(null); // planId yang sedang diproses
  const [checkoutError, setCheckoutError] = useState(null);

  // ── Redirect jika belum login ───────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // ── Muat riwayat transaksi ─────────────────────────────────────────────────
  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    setIsTxLoading(true);
    setTxError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/payment/transactions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat transaksi.");
      setTransactions(json.transactions || []);
    } catch (err) {
      setTxError(err.message);
    } finally {
      setIsTxLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchTransactions();
  }, [user, fetchTransactions]);

  // ── Checkout handler ───────────────────────────────────────────────────────
  const handleCheckout = async (planId) => {
    if (!user || checkoutLoading) return;
    setCheckoutLoading(planId);
    setCheckoutError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/payment/doku/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal membuat sesi pembayaran.");
      // Redirect ke halaman pembayaran DOKU (atau mock URL)
      window.location.href = json.checkoutUrl;
    } catch (err) {
      setCheckoutError(err.message);
      setCheckoutLoading(null);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading || (!user && !loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="w-5 h-5 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const plans = Object.values(SUBSCRIPTION_PLANS);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-white border-b border-[#E5E7EB]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#111111] transition-colors font-mono"
          >
            <IconArrowLeft className="w-3.5 h-3.5" />
            Dashboard
          </Link>
          <span className="text-[#D1D5DB] font-mono">/</span>
          <span className="text-xs font-mono text-[#111111]">Langganan & Billing</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* ── Notifikasi Callback ──────────────────────────────────────────── */}
        {callbackStatus === "success" && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md text-sm text-emerald-800">
            <strong>Pembayaran diterima!</strong>{" "}
            {isMockReturn
              ? `Simulasi berhasil (Order: ${callbackOrderId}). Status transaksi akan diperbarui otomatis.`
              : `Order ${callbackOrderId} sedang diverifikasi. Status akan diperbarui dalam beberapa saat.`}
          </div>
        )}

        {/* ── Status Akun ─────────────────────────────────────────────────── */}
        <section className="bg-white border border-[#E5E7EB] rounded-md p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                isPremium ? "bg-amber-100" : "bg-[#F3F4F6]"
              }`}
            >
              <IconCrown
                className={`w-5 h-5 ${isPremium ? "text-amber-600" : "text-[#9CA3AF]"}`}
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#111111]">
                {userData?.subscriptionPlan === "mahasiswa_bulanan"
                  ? "Paket BEM & Himpunan (Aktif)"
                  : isPremium
                  ? "Event Pass Mahasiswa (Aktif)"
                  : "Akun Komunitas (Gratis)"}
              </p>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Batas Kuota: <strong className="text-[#111111]">{userData?.maxActiveEvents || (isPremium ? 15 : 1)} Acara Aktif Simultan</strong>
                {isPremium && " · Bebas Watermark SertiGen"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-mono font-semibold uppercase tracking-wider px-2.5 py-1 rounded border ${
                isPremium
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-gray-50 border-gray-200 text-gray-700"
              }`}
            >
              {isPremium ? "Premium" : "Free Tier"}
            </span>
          </div>
        </section>

        {/* ── Pilihan Paket Mahasiswa & Kampus ───────────────────────────────── */}
        <section className="space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-800 rounded">
                Edisi Organisasi Mahasiswa & Kepanitiaan Kampus
              </span>
            </div>
            <h2 className="text-lg font-light text-[#111111] tracking-tight mt-1.5">
              Pilihan Paket Ramah Kas Kepanitiaan
            </h2>
            <p className="text-xs text-[#6B7280] font-light mt-0.5">
              Solusi hemat untuk BEM, Himpunan Mahasiswa, UKM, dan Panitia Lomba kampus. Tanpa komitmen rumit.
            </p>
          </div>

          {checkoutError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-[4px] text-xs text-red-700">
              {checkoutError}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            {plans.map((plan) => {
              const isPopular = plan.id === "mahasiswa_event_pass";
              const isLoading = checkoutLoading === plan.id;
              const isCurrentMonthly =
                userData?.subscriptionPlan === "mahasiswa_bulanan" &&
                plan.id === "mahasiswa_bulanan";

              return (
                <div
                  key={plan.id}
                  className={`relative bg-white border rounded-md p-5 space-y-4 transition-shadow hover:shadow-sm ${
                    isPopular ? "border-[#111111]" : "border-[#E5E7EB]"
                  }`}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <span
                      className={`absolute -top-2.5 left-4 text-[10px] font-mono font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                        isPopular
                          ? "bg-[#111111] text-white"
                          : "bg-blue-600 text-white"
                      }`}
                    >
                      {plan.badge}
                    </span>
                  )}

                  <div>
                    <h3 className="text-sm font-medium text-[#111111]">{plan.name}</h3>
                    <p className="text-[11px] text-[#6B7280] mt-0.5 leading-snug">{plan.description}</p>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-[#111111] tracking-tight">
                        {formatRupiah(plan.price)}
                      </span>
                      <span className="text-xs text-[#9CA3AF] font-mono">
                        /{plan.cycleLabel || (plan.billingCycle === "monthly" ? "bulan" : "acara")}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-[#F9FAFB] border border-[#F3F4F6] rounded text-[11px] text-[#4B5563]">
                    <strong className="text-[#111111] block mb-0.5 font-medium">Cocok Untuk:</strong>
                    {plan.targetAudience}
                  </div>

                  <ul className="space-y-1.5">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-xs text-[#52525B]">
                        <IconCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-px" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => handleCheckout(plan.id)}
                    disabled={!!checkoutLoading || isCurrentMonthly}
                    className={`w-full py-2.5 text-xs font-mono uppercase rounded-[4px] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${
                      isPopular
                        ? "bg-[#111111] hover:bg-[#333333] text-white"
                        : "border border-[#111111] text-[#111111] hover:bg-[#F5F5F5]"
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Mengarahkan ke DOKU...
                      </>
                    ) : isCurrentMonthly ? (
                      "Paket Aktif Anda"
                    ) : (
                      `Pilih ${plan.name}`
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-[#9CA3AF] text-center">
            Pembayaran diproses aman melalui DOKU Jokul · QRIS, GoPay, OVO, ShopeePay, dan Virtual Account Bank
          </p>
        </section>

        {/* ── Riwayat Transaksi ────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-[#111111] tracking-tight flex items-center gap-1.5">
              <IconReceipt className="w-4 h-4 text-[#9CA3AF]" />
              Riwayat Transaksi
            </h2>
            <button
              type="button"
              onClick={fetchTransactions}
              disabled={isTxLoading}
              className="text-[11px] font-mono text-[#6B7280] hover:text-[#111111] transition-colors disabled:opacity-40"
            >
              {isTxLoading ? "Memuat..." : "Perbarui"}
            </button>
          </div>

          {txError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-[4px] text-xs text-red-700">
              {txError}
            </div>
          )}

          {isTxLoading ? (
            <div className="bg-white border border-[#E5E7EB] rounded-md p-8 flex justify-center">
              <div className="w-4 h-4 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="bg-white border border-[#E5E7EB] rounded-md p-8 text-center">
              <p className="text-xs text-[#9CA3AF]">Belum ada riwayat transaksi.</p>
            </div>
          ) : (
            <div className="bg-white border border-[#E5E7EB] rounded-md overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                    <th className="px-4 py-2.5 text-left font-mono font-semibold text-[#6B7280] uppercase tracking-wider text-[10px]">
                      Order ID
                    </th>
                    <th className="px-4 py-2.5 text-left font-mono font-semibold text-[#6B7280] uppercase tracking-wider text-[10px] hidden sm:table-cell">
                      Paket
                    </th>
                    <th className="px-4 py-2.5 text-right font-mono font-semibold text-[#6B7280] uppercase tracking-wider text-[10px]">
                      Nominal
                    </th>
                    <th className="px-4 py-2.5 text-center font-mono font-semibold text-[#6B7280] uppercase tracking-wider text-[10px]">
                      Status
                    </th>
                    <th className="px-4 py-2.5 text-right font-mono font-semibold text-[#6B7280] uppercase tracking-wider text-[10px] hidden md:table-cell">
                      Tanggal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {transactions.map((tx) => (
                    <tr key={tx.orderId} className="hover:bg-[#FAFAFA] transition-colors">
                      <td className="px-4 py-3 font-mono text-[#111111] max-w-[120px] truncate">
                        {tx.orderId}
                        {tx.isMock && (
                          <span className="ml-1 text-[9px] text-[#9CA3AF] font-mono">[mock]</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#52525B] hidden sm:table-cell">
                        {tx.planName || tx.planId || "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[#111111]">
                        {formatRupiah(tx.amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded border text-[10px] font-mono font-semibold uppercase ${
                            STATUS_STYLE[tx.status] || STATUS_STYLE.pending
                          }`}
                        >
                          {STATUS_LABEL[tx.status] || tx.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-[#9CA3AF] hidden md:table-cell">
                        {formatDate(tx.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-8">
          <div className="flex items-center gap-2.5 font-mono text-xs text-[#6B7280]">
            <div className="w-4 h-4 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
            <span>Memuat halaman billing...</span>
          </div>
        </div>
      }
    >
      <BillingContent />
    </Suspense>
  );
}

