import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTicket } from "../api/tickets";

export default function CreateTicket() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    subject: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const ticket = await createTicket(form);
      navigate(`/tickets/${ticket.ticket_id}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="font-display text-2xl font-semibold text-ink mb-6">Create New Ticket</h1>

      <form onSubmit={handleSubmit} className="bg-white border border-line rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate mb-1.5">Customer Name</label>
          <input
            type="text"
            required
            value={form.customer_name}
            onChange={(e) => updateField("customer_name", e.target.value)}
            className="w-full border border-line rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate mb-1.5">Customer Email</label>
          <input
            type="email"
            required
            value={form.customer_email}
            onChange={(e) => updateField("customer_email", e.target.value)}
            className="w-full border border-line rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate mb-1.5">Subject</label>
          <input
            type="text"
            required
            value={form.subject}
            onChange={(e) => updateField("subject", e.target.value)}
            className="w-full border border-line rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate mb-1.5">Description</label>
          <textarea
            required
            rows={4}
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            className="w-full border border-line rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="bg-accent text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-accent-dark disabled:opacity-50 transition-colors"
          >
            {submitting ? "Creating..." : "Create Ticket"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="px-4 py-2 rounded-md text-sm font-medium text-slate hover:bg-canvas transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}