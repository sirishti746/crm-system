import { useEffect, useState, useCallback } from "react";
import { fetchTickets, fetchStats, deleteTicket } from "../api/tickets";
import { STATUS_META } from "../components/StatusBadge";

function StatCard({ label, value }) {
  return (
    <div className="bg-white border border-line rounded-lg px-5 py-4">
      <p className="text-xs font-medium text-slate uppercase tracking-wide">{label}</p>
      <p className="font-display text-2xl font-semibold text-ink mt-1">
        {value === null ? "–" : value}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchTickets({ search, status })
      .then(setTickets)
      .catch(() => setError("Could not load tickets. Is the backend running?"))
      .finally(() => setLoading(false));
  }, [search, status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetchStats().then(setStats).catch(() => setStats(null));
  }, [tickets.length]);

  async function handleDelete(e, ticketId) {
    e.stopPropagation();
    if (!window.confirm(`Delete ticket ${ticketId}? This cannot be undone.`)) return;
    try {
      await deleteTicket(ticketId);
      load();
    } catch {
      setError("Failed to delete ticket.");
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="font-display text-2xl font-semibold text-ink mb-6">Support Tickets</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total" value={stats?.total ?? null} />
        <StatCard label="Open" value={stats?.by_status?.Open ?? null} />
        <StatCard label="In Progress" value={stats?.by_status?.["In Progress"] ?? null} />
        <StatCard label="Closed" value={stats?.by_status?.Closed ?? null} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name, email, ID, subject..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-white border border-line rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-white border border-line rounded-md px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      {loading && <p className="text-slate text-sm">Loading tickets...</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}

      {!loading && !error && tickets.length === 0 && (
        <div className="bg-white border border-line rounded-lg py-12 text-center">
          <p className="text-slate text-sm">No tickets match your search.</p>
        </div>
      )}

      {!loading && !error && tickets.length > 0 && (
        <div className="bg-white border border-line rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate uppercase tracking-wide">
              <tr>
                <th className="w-1 p-0"></th>
                <th className="px-4 py-3 font-medium">Ticket</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {tickets.map((t) => {
                const meta = STATUS_META[t.status] || STATUS_META.Open;
                return (
                  <tr
                    key={t.ticket_id}
                    className="cursor-pointer hover:bg-canvas transition-colors"
                    onClick={() => window.location.assign(`/tickets/${t.ticket_id}`)}
                  >
                    <td className={`w-1 p-0 ${t.escalated ? "bg-red-500" : meta.rail}`}></td>
                    <td className="px-4 py-3 font-mono text-xs text-ink">{t.ticket_id}</td>
                    <td className="px-4 py-3 text-ink">{t.customer_name}</td>
                    <td className="px-4 py-3 text-ink">{t.subject}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.pill}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                          {t.status}
                        </span>
                        {t.escalated && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700">
                            L2
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate">{new Date(t.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => handleDelete(e, t.ticket_id)}
                        className="text-red-600 text-xs font-medium hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}