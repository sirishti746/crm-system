import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getTicket, updateTicket, deleteTicket, uploadAttachment, deleteAttachment } from "../api/tickets";
import StatusBadge from "../components/StatusBadge";

const STATUSES = ["Open", "In Progress", "Closed"];
// const API_ORIGIN = "http://127.0.0.1:8000";
const API_ORIGIN = import.meta.env.VITE_API_URL;

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

export default function TicketDetail() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removingAttachmentId, setRemovingAttachmentId] = useState(null);

  const [escalateReason, setEscalateReason] = useState("");
  const [showEscalateForm, setShowEscalateForm] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  const [pendingStatus, setPendingStatus] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setNotFound(false);
    setError(null);
    getTicket(ticketId)
      .then((t) => {
        setTicket(t);
        setPendingStatus(t.status);
      })
      .catch((err) => {
        if (err.message === "NOT_FOUND") setNotFound(true);
        else setError("Could not load ticket. Is the backend running?");
      })
      .finally(() => setLoading(false));
  }, [ticketId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatusSubmit() {
    if (!pendingStatus || pendingStatus === ticket.status) return;
    setSaving(true);
    try {
      await updateTicket(ticketId, { status: pendingStatus });
      navigate("/");
    } catch {
      setError("Failed to update ticket.");
      setSaving(false);
    }
  }

  async function handleEscalate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateTicket(ticketId, { escalated: true, escalation_note: escalateReason.trim() });
      setTicket(updated);
      setPendingStatus(updated.status);
      setEscalateReason("");
      setShowEscalateForm(false);
    } catch {
      setError("Failed to escalate ticket.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeEscalate() {
    setSaving(true);
    try {
      const updated = await updateTicket(ticketId, { escalated: false });
      setTicket(updated);
      setPendingStatus(updated.status);
    } catch {
      setError("Failed to update ticket.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddNote(e) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setSaving(true);
    try {
      const updated = await updateTicket(ticketId, { note: noteText.trim() });
      setTicket(updated);
      setPendingStatus(updated.status);
      setNoteText("");
    } catch {
      setError("Failed to add note.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete ticket ${ticketId}? This cannot be undone.`)) return;
    try {
      await deleteTicket(ticketId);
      navigate("/");
    } catch {
      setError("Failed to delete ticket.");
    }
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await uploadAttachment(ticketId, file);
      const fresh = await getTicket(ticketId);
      setTicket(fresh);
      setPendingStatus(fresh.status);
    } catch {
      setError("Failed to upload image. Only PNG, JPG, GIF, and WEBP are supported.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleRemoveAttachment(attachmentId) {
    if (!window.confirm("Remove this screenshot?")) return;
    setRemovingAttachmentId(attachmentId);
    setError(null);
    try {
      await deleteAttachment(ticketId, attachmentId);
      const fresh = await getTicket(ticketId);
      setTicket(fresh);
      setPendingStatus(fresh.status);
    } catch {
      setError("Failed to remove screenshot.");
    } finally {
      setRemovingAttachmentId(null);
    }
  }

  function startEditing() {
    setEditForm({
      customer_name: ticket.customer_name,
      customer_email: ticket.customer_email,
      subject: ticket.subject,
      description: ticket.description,
    });
    setEditError(null);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setEditForm(null);
    setEditError(null);
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!editForm.customer_name.trim() || !editForm.customer_email.trim() || !editForm.subject.trim() || !editForm.description.trim()) {
      setEditError("All fields are required.");
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const updated = await updateTicket(ticketId, editForm);
      setTicket(updated);
      setPendingStatus(updated.status);
      setEditing(false);
      setEditForm(null);
    } catch {
      setEditError("Failed to save changes.");
    } finally {
      setEditSaving(false);
    }
  }

  if (loading) return <div className="max-w-3xl mx-auto px-6 py-8 text-slate text-sm">Loading ticket...</div>;

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white border border-line rounded-lg p-8 text-center">
          <p className="text-ink mb-3">
            Ticket <span className="font-mono text-sm">{ticketId}</span> was not found.
          </p>
          <Link to="/" className="text-accent text-sm font-medium hover:underline">← Back to dashboard</Link>
        </div>
      </div>
    );
  }

  if (error && !ticket) {
    return <div className="max-w-3xl mx-auto px-6 py-8 text-red-600 text-sm">{error}</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <Link to="/" className="text-accent text-sm font-medium hover:underline">← Back to dashboard</Link>

      <div className="bg-white border border-line rounded-lg shadow-sm mt-4 overflow-hidden">
        <div className="flex items-start justify-between px-6 py-5 border-b border-line bg-canvas/40">
          <div>
            <h1 className="font-display text-xl font-semibold text-ink">{ticket.subject}</h1>
            <p className="text-xs font-mono text-slate mt-1">{ticket.ticket_id}</p>
          </div>
          <div className="flex items-center gap-4">
            {ticket.escalated && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                L2 Escalated
              </span>
            )}
            <StatusBadge status={ticket.status} />
            {!editing && (
              <button onClick={startEditing} className="flex items-center gap-1 text-accent text-sm font-medium hover:underline">
                <PencilIcon /> Edit
              </button>
            )}
            <button onClick={handleDelete} className="text-red-600 text-sm font-medium hover:underline">
              Delete
            </button>
          </div>
        </div>

        {error && (
          <div className="px-6 pt-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {editing ? (
          <form onSubmit={handleEditSubmit} className="px-6 py-6 border-b border-line space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate mb-1.5">Customer name</label>
                <input
                  type="text"
                  value={editForm.customer_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, customer_name: e.target.value }))}
                  className="w-full border border-line rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate mb-1.5">Customer email</label>
                <input
                  type="email"
                  value={editForm.customer_email}
                  onChange={(e) => setEditForm((f) => ({ ...f, customer_email: e.target.value }))}
                  className="w-full border border-line rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate mb-1.5">Subject</label>
              <input
                type="text"
                value={editForm.subject}
                onChange={(e) => setEditForm((f) => ({ ...f, subject: e.target.value }))}
                className="w-full border border-line rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate mb-1.5">Description</label>
              <textarea
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full border border-line rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
              />
            </div>
            {editError && <p className="text-red-600 text-sm">{editError}</p>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={editSaving}
                className="bg-accent text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-accent-dark disabled:opacity-50 transition-colors"
              >
                {editSaving ? "Saving..." : "Save changes"}
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                disabled={editSaving}
                className="px-4 py-2 rounded-md text-sm font-medium text-slate hover:bg-canvas transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 px-6 py-6">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate mb-2">Customer</h2>
              <p className="text-sm text-ink">{ticket.customer_name}</p>
              <p className="text-sm text-slate">{ticket.customer_email}</p>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate mb-2">Description</h2>
              <p className="text-sm text-ink whitespace-pre-wrap">{ticket.description}</p>
            </div>
          </div>
        )}

        <div className="px-6 pb-6 flex flex-wrap items-end gap-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate mb-2">Status</label>
            <select
              value={pendingStatus}
              disabled={saving}
              onChange={(e) => setPendingStatus(e.target.value)}
              className="w-full sm:w-64 border border-line rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent disabled:opacity-50"
            >
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div>
            {ticket.escalated ? (
              <button
                onClick={handleDeEscalate}
                disabled={saving}
                className="text-sm font-medium text-slate hover:text-ink border border-line rounded-md px-3 py-2 hover:bg-canvas transition-colors disabled:opacity-50"
              >
                De-escalate to Level 1
              </button>
            ) : (
              <button
                onClick={() => setShowEscalateForm((v) => !v)}
                className="text-sm font-medium text-red-600 border border-red-200 rounded-md px-3 py-2 hover:bg-red-50 transition-colors"
              >
                Escalate to Level 2
              </button>
            )}
          </div>
        </div>

        {showEscalateForm && !ticket.escalated && (
          <div className="px-6 pb-6">
            <form onSubmit={handleEscalate} className="max-w-lg flex gap-2">
              <input
                type="text"
                required
                placeholder="Why does this need L2 support?"
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
                className="flex-1 border border-line rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
              />
              <button
                type="submit"
                disabled={saving}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                Confirm
              </button>
            </form>
          </div>
        )}

        {ticket.escalated && ticket.escalation_note && (
          <div className="px-6 pb-6">
            <div className="bg-red-50 border border-red-100 rounded-md p-3 max-w-lg">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700 mb-1">Escalation reason</p>
              <p className="text-sm text-red-900">{ticket.escalation_note}</p>
            </div>
          </div>
        )}

        <div className="px-6 pb-6 pt-2 border-t border-line">
          <div className="flex items-center justify-between mt-4 mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate">Screenshots</h2>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-accent text-xs font-semibold hover:underline disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "+ Add screenshot"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              onChange={handleFileSelected}
              className="hidden"
            />
          </div>

          {ticket.attachments.length === 0 ? (
            <p className="text-sm text-slate">No screenshots yet.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {ticket.attachments.map((a) => (
                
                <div key={a.id} className="relative group">
                  <a
                  
                    href={`${API_ORIGIN}${a.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block border border-line rounded-md overflow-hidden hover:ring-2 hover:ring-accent/40 transition-shadow"
                  >
                    <img src={`${API_ORIGIN}${a.url}`} alt={a.original_name} className="w-full h-24 object-cover" />
                  </a>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); handleRemoveAttachment(a.id); }}
                    disabled={removingAttachmentId === a.id}
                    aria-label="Remove screenshot"
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-ink/70 text-white flex items-center justify-center text-xs leading-none opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-opacity disabled:opacity-100 disabled:bg-slate"
                  >
                    {removingAttachmentId === a.id ? "…" : "✕"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 pb-6 pt-2 border-t border-line">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate mt-4 mb-3">Notes</h2>
          <form onSubmit={handleAddNote} className="mb-4 flex gap-2 max-w-lg">
            <input
              type="text"
              placeholder="Add a note..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="flex-1 border border-line rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            />
            <button
              type="submit"
              disabled={saving}
              className="bg-accent text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-accent-dark disabled:opacity-50 transition-colors"
            >
              Add
            </button>
          </form>
          <div className="space-y-2 max-w-lg">
            {ticket.notes.length === 0 && <p className="text-sm text-slate">No notes yet.</p>}
            {ticket.notes.map((n) => (
              <div key={n.id} className="border border-line rounded-md p-3 text-sm">
                <p className="text-ink">{n.note_text}</p>
                <p className="text-slate text-xs mt-1 font-mono">{new Date(n.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-6 border-t border-line">
          <button
            onClick={handleStatusSubmit}
            disabled={pendingStatus === ticket.status || saving}
            className="w-full bg-accent text-white py-3 rounded-md text-sm font-semibold hover:bg-accent-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving..." : "Submit"}
          </button>
          {pendingStatus === ticket.status && (
            <p className="text-xs text-slate text-center mt-2">Change the status above to enable saving.</p>
          )}
        </div>
      </div>
    </div>
  );
}