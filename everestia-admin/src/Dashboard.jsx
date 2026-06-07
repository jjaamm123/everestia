import { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Mail,
  Phone,
  MapPin,
  X,
  Eye,
  RefreshCw,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Truck,
  Weight,
  CalendarDays,
  MessageSquare,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import api from './api/axios';

const STATUSES = ['Pending', 'Reviewed', 'Responded'];

const STATUS_STYLES = {
  Pending: {
    dot:  'bg-amber-400',
    pill: 'bg-amber-400/10 text-amber-400 border border-amber-400/25',
  },
  Reviewed: {
    dot:  'bg-blue-400',
    pill: 'bg-blue-400/10 text-blue-400 border border-blue-400/25',
  },
  Responded: {
    dot:  'bg-emerald-400',
    pill: 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/25',
  },
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
    year:  'numeric',
  });
}

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', {
    hour:   '2-digit',
    minute: '2-digit',
  });
}

function SkeletonRow() {
  return (
    <tr className="border-b border-white/5">
      {[40, 48, 44, 36, 28, 20].map((w, i) => (
        <td key={i} className="px-6 py-4">
          <div
            className={`h-3 rounded-full bg-white/8 animate-pulse`}
            style={{ width: `${w}%` }}
          />
        </td>
      ))}
    </tr>
  );
}

function SkeletonTable() {
  return (
    <tbody>
      {Array.from({ length: 6 }, (_, i) => <SkeletonRow key={i} />)}
    </tbody>
  );
}

function EmptyState() {
  return (
    <tbody>
      <tr>
        <td colSpan={6}>
          <div className="flex flex-col items-center justify-center py-24 px-8 gap-5 text-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-[#0F2060] border border-white/10 flex items-center justify-center">
                <Inbox size={40} className="text-[#E8620A] opacity-70" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#E8620A] flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">0</span>
              </div>
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg mb-1">No quote requests yet</h3>
              <p className="text-[#7A8BB5] text-sm max-w-xs">
                When customers submit freight quotes through the website, they'll appear here.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#7A8BB5] bg-white/4 border border-white/8 rounded-lg px-4 py-2.5">
              <Package size={14} className="text-[#E8620A]" />
              <span>Submissions arrive in real-time</span>
            </div>
          </div>
        </td>
      </tr>
    </tbody>
  );
}

function Toast({ toasts }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium
            pointer-events-auto animate-in slide-in-from-right-8 duration-300
            ${t.type === 'success'
              ? 'bg-emerald-900/90 border-emerald-500/30 text-emerald-300'
              : 'bg-red-900/90 border-red-500/30 text-red-300'
            }`}
        >
          {t.type === 'success'
            ? <CheckCircle2 size={16} className="shrink-0" />
            : <AlertCircle size={16} className="shrink-0" />
          }
          {t.message}
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent, sub }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-[#0A1845] p-5">
      <div
        className="absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-10 blur-2xl"
        style={{ backgroundColor: accent }}
      />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[#7A8BB5] text-xs font-medium uppercase tracking-widest mb-2">{label}</p>
          <p className="text-3xl font-bold text-white font-display">{value}</p>
          {sub && <p className="text-[#7A8BB5] text-xs mt-1">{sub}</p>}
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${accent}20`, border: `1px solid ${accent}30` }}
        >
          <Icon size={18} style={{ color: accent }} />
        </div>
      </div>
    </div>
  );
}

function QuoteModal({ quote, onClose }) {
  if (!quote) return null;

  const fields = [
    { icon: Building2,   label: 'Company',     value: quote.company || '—' },
    { icon: Phone,       label: 'Phone',        value: quote.phone,
      href: `tel:${quote.phone}` },
    { icon: Mail,        label: 'Email',        value: quote.email,
      href: `mailto:${quote.email}` },
    { icon: MapPin,      label: 'Route',        value: `${quote.originCity} → ${quote.destinationCity}` },
    { icon: Truck,       label: 'Service',      value: quote.serviceNeeded },
    { icon: Weight,      label: 'Weight',       value: quote.weight ? `${quote.weight.toLocaleString()} lbs` : '—' },
    { icon: CalendarDays,label: 'Pickup Date',  value: formatDate(quote.pickupDate) },
    { icon: Clock,       label: 'Submitted',    value: `${formatDate(quote.createdAt)} at ${formatTime(quote.createdAt)}` },
  ];

  const statusStyle = STATUS_STYLES[quote.status] || STATUS_STYLES.Pending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Quote details for ${quote.fullName}`}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-lg bg-[#0A1845] border border-white/10 rounded-2xl shadow-2xl overflow-hidden
                   max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-6 border-b border-white/8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-white font-semibold text-lg">{quote.fullName}</h2>
              <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${statusStyle.pill}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                {quote.status}
              </span>
            </div>
            <p className="text-[#7A8BB5] text-sm font-mono">#{String(quote._id).slice(-8).toUpperCase()}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7A8BB5]
                       hover:bg-white/8 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-3">
          {fields.map(({ icon: Icon, label, value, href }) => (
            <div
              key={label}
              className="flex items-start gap-3 rounded-xl bg-white/3 border border-white/5 px-4 py-3"
            >
              <Icon size={15} className="text-[#E8620A] mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[#7A8BB5] text-[11px] uppercase tracking-widest font-medium mb-0.5">
                  {label}
                </p>
                {href ? (
                  <a
                    href={href}
                    className="text-white text-sm hover:text-[#E8620A] transition-colors break-all"
                  >
                    {value}
                  </a>
                ) : (
                  <p className="text-white text-sm break-words">{value}</p>
                )}
              </div>
            </div>
          ))}

          {quote.message && (
            <div className="rounded-xl bg-white/3 border border-white/5 px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={14} className="text-[#E8620A]" />
                <p className="text-[#7A8BB5] text-[11px] uppercase tracking-widest font-medium">Message</p>
              </div>
              <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{quote.message}</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/8 flex gap-3">
          <a
            href={`mailto:${quote.email}?subject=Re: Your Freight Quote Request — Everestia Ventures`}
            className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold
                       bg-[#E8620A] hover:bg-[#FF8C00] text-white rounded-xl py-2.5
                       transition-colors"
          >
            <Mail size={15} />
            Reply via Email
          </a>
          <a
            href={`tel:${quote.phone}`}
            className="flex items-center justify-center gap-2 text-sm font-semibold px-4
                       bg-white/6 hover:bg-white/10 text-white rounded-xl py-2.5
                       border border-white/10 transition-colors"
          >
            <Phone size={15} />
            Call
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [quotes,        setQuotes]        = useState([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const [error,         setError]         = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [updatingId,    setUpdatingId]    = useState(null);
  const [toasts,        setToasts]        = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const fetchQuotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/quotes');
      setQuotes(data.data ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  const handleStatusChange = useCallback(async (quoteId, newStatus) => {
    setUpdatingId(quoteId);
    try {
      await api.patch(`/api/admin/quotes/${quoteId}/status`, { status: newStatus });

      setQuotes((prev) =>
        prev.map((q) => (q._id === quoteId ? { ...q, status: newStatus } : q))
      );
      addToast(`Status updated to "${newStatus}"`, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setUpdatingId(null);
    }
  }, [addToast]);

  const stats = {
    total:     quotes.length,
    pending:   quotes.filter((q) => q.status === 'Pending').length,
    reviewed:  quotes.filter((q) => q.status === 'Reviewed').length,
    responded: quotes.filter((q) => q.status === 'Responded').length,
  };

  return (
    <div className="min-h-screen bg-[#04091E] text-[#E8ECF5]" style={{ fontFamily: "'Inter', sans-serif" }}>

      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#04091E]/80 backdrop-blur-md">
        <div className="max-w-screen-xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E8620A] to-[#FF8C00] flex items-center justify-center">
              <Truck size={16} className="text-white" />
            </div>
            <div>
              <span className="text-white font-semibold text-sm tracking-wide">EVERESTIA</span>
              <span className="text-[#7A8BB5] text-sm ml-1">/ Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-[#7A8BB5]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              API Connected
            </span>
            <button
              onClick={fetchQuotes}
              disabled={isLoading}
              className="flex items-center gap-2 text-xs font-medium text-[#7A8BB5] hover:text-white
                         bg-white/5 hover:bg-white/10 border border-white/10
                         rounded-lg px-3 py-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-8 space-y-8">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Quote Requests</h1>
            <p className="text-[#7A8BB5] text-sm mt-0.5">
              Inbound freight leads from the public website
            </p>
          </div>
          {!isLoading && quotes.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-[#7A8BB5] bg-white/4 border border-white/8 rounded-lg px-3 py-2">
              <ChevronRight size={12} className="text-[#E8620A]" />
              {stats.total} total submission{stats.total !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-950/40 px-5 py-4">
            <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-red-300 font-medium text-sm">Failed to load quotes</p>
              <p className="text-red-400/80 text-xs mt-0.5">{error}</p>
            </div>
            <button
              onClick={fetchQuotes}
              className="ml-auto text-xs text-red-400 hover:text-red-300 font-medium shrink-0 underline"
            >
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Leads"
            value={isLoading ? '—' : stats.total}
            icon={TrendingUp}
            accent="#E8620A"
            sub="all time"
          />
          <StatCard
            label="Pending"
            value={isLoading ? '—' : stats.pending}
            icon={Clock}
            accent="#F59E0B"
            sub="awaiting review"
          />
          <StatCard
            label="Reviewed"
            value={isLoading ? '—' : stats.reviewed}
            icon={Eye}
            accent="#60A5FA"
            sub="in progress"
          />
          <StatCard
            label="Responded"
            value={isLoading ? '—' : stats.responded}
            icon={CheckCircle2}
            accent="#34D399"
            sub="closed"
          />
        </div>

        <div className="rounded-2xl border border-white/8 bg-[#0A1845] overflow-hidden">

          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
            <div className="flex items-center gap-2">
              <Package size={15} className="text-[#E8620A]" />
              <h2 className="text-white font-semibold text-sm">All Submissions</h2>
            </div>
            {!isLoading && quotes.length > 0 && (
              <span className="text-[10px] text-[#7A8BB5] uppercase tracking-widest">
                Showing {quotes.length} record{quotes.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[780px]">
              <thead>
                <tr className="border-b border-white/8">
                  {['Date', 'Customer', 'Route', 'Service', 'Status', 'Actions'].map((col) => (
                    <th
                      key={col}
                      className="px-6 py-3.5 text-left text-[10px] font-semibold text-[#7A8BB5] uppercase tracking-widest"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>

              {isLoading && <SkeletonTable />}

              {!isLoading && quotes.length === 0 && !error && <EmptyState />}

              {!isLoading && quotes.length > 0 && (
                <tbody>
                  {quotes.map((quote, idx) => {
                    const statusStyle = STATUS_STYLES[quote.status] || STATUS_STYLES.Pending;
                    const isUpdating  = updatingId === quote._id;

                    return (
                      <tr
                        key={quote._id}
                        className={`border-b border-white/5 transition-colors hover:bg-white/[0.025]
                          ${idx % 2 === 0 ? '' : 'bg-white/[0.015]'}`}
                      >

                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-white/90 text-sm">{formatDate(quote.createdAt)}</p>
                          <p className="text-[#7A8BB5] text-xs">{formatTime(quote.createdAt)}</p>
                        </td>

                        <td className="px-6 py-4">
                          <p className="text-white font-medium text-sm truncate max-w-[160px]">
                            {quote.fullName}
                          </p>
                          {quote.company && (
                            <p className="text-[#7A8BB5] text-xs truncate max-w-[160px] flex items-center gap-1 mt-0.5">
                              <Building2 size={10} />
                              {quote.company}
                            </p>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-xs text-[#E8ECF5]/80">
                            <MapPin size={11} className="text-[#E8620A] shrink-0" />
                            <span className="truncate max-w-[60px]">{quote.originCity}</span>
                            <ChevronRight size={10} className="text-[#7A8BB5] shrink-0" />
                            <span className="truncate max-w-[60px]">{quote.destinationCity}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex text-xs px-2.5 py-1 rounded-lg
                                           bg-[#E8620A]/10 text-[#E8620A] border border-[#E8620A]/20
                                           font-medium whitespace-nowrap">
                            {quote.serviceNeeded}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="relative">
                            <span
                              className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}
                            />
                            <select
                              value={quote.status}
                              disabled={isUpdating}
                              onChange={(e) => handleStatusChange(quote._id, e.target.value)}
                              aria-label={`Update status for ${quote.fullName}`}
                              className={`w-full pl-6 pr-3 py-1.5 text-xs font-medium rounded-lg
                                         border appearance-none cursor-pointer
                                         bg-[#04091E] outline-none transition-all
                                         disabled:opacity-50 disabled:cursor-wait
                                         focus:ring-1 focus:ring-[#E8620A]/50
                                         ${statusStyle.pill}`}
                            >
                              {STATUSES.map((s) => (
                                <option key={s} value={s} className="bg-[#0A1845] text-white">
                                  {s}
                                </option>
                              ))}
                            </select>
                            {isUpdating && (
                              <RefreshCw
                                size={10}
                                className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-[#7A8BB5]"
                              />
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <button
                            onClick={() => setSelectedQuote(quote)}
                            className="flex items-center gap-1.5 text-xs font-medium
                                       text-[#7A8BB5] hover:text-white
                                       bg-white/5 hover:bg-white/10 border border-white/10
                                       rounded-lg px-3 py-1.5 transition-all"
                            aria-label={`View details for ${quote.fullName}`}
                          >
                            <Eye size={13} />
                            View
                          </button>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              )}
            </table>
          </div>
        </div>

        <footer className="text-center pb-4">
          <p className="text-[#7A8BB5] text-xs">
            Everestia Ventures LLC &mdash; Admin Dashboard &mdash; Summit Logistics
          </p>
        </footer>

      </main>

      {selectedQuote && (
        <QuoteModal
          quote={selectedQuote}
          onClose={() => setSelectedQuote(null)}
        />
      )}

      <Toast toasts={toasts} />

    </div>
  );
}
