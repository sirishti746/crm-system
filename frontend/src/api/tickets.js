// const BASE_URL = "http://127.0.0.1:8000/api/tickets";
const BASE_URL = `${import.meta.env.VITE_API_URL}/api/tickets`;

function authHeaders(extra = {}) {
  const token = localStorage.getItem("token") || "";
  return { "X-App-Token": token, ...extra };
}

async function authFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });
  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.assign("/login");
    throw new Error("UNAUTHORIZED");
  }
  return res;
}

export async function fetchTickets({ status, search, assigned_to } = {}) {
  const params = new URLSearchParams();
  if (status) params.append("status", status);
  if (search) params.append("search", search);
  if (assigned_to) params.append("assigned_to", assigned_to);

  const res = await authFetch(`${BASE_URL}?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch tickets");
  return res.json();
}

export async function createTicket(payload) {
  const res = await authFetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.detail?.[0]?.msg || "Failed to create ticket");
  }

  return res.json();
}

export async function getTicket(ticketId) {
  const res = await authFetch(`${BASE_URL}/${ticketId}`);
  if (res.status === 404) throw new Error("NOT_FOUND");
  if (!res.ok) throw new Error("Failed to fetch ticket");
  return res.json();
}

export async function updateTicket(ticketId, payload) {
  const res = await authFetch(`${BASE_URL}/${ticketId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update ticket");
  return res.json();
}

export async function deleteTicket(ticketId) {
  const res = await authFetch(`${BASE_URL}/${ticketId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete ticket");
}

export async function fetchStats() {
  const res = await authFetch(`${BASE_URL}/stats/summary`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function uploadAttachment(ticketId, file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await authFetch(`${BASE_URL}/${ticketId}/attachments`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload attachment");
  return res.json();
}

export async function importTickets(rows) {
  const res = await authFetch(`${BASE_URL}/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tickets: rows }),
  });
  if (!res.ok) throw new Error("Failed to import tickets");
  return res.json();
}

export async function deleteAttachment(ticketId, attachmentId) {
  const res = await authFetch(`${BASE_URL}/${ticketId}/attachments/${attachmentId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete attachment");
}