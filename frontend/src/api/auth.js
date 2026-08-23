// const BASE_URL = "http://127.0.0.1:8000/api/auth";
const BASE_URL = `${import.meta.env.VITE_API_URL}/api/auth`;

export async function register(username, email, password) {
  const res = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail || "Registration failed");
  }
  return res.json();
}

export async function login(username, password) {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail || "Login failed");
  }
  return res.json();
}

export async function logout() {
  const token = localStorage.getItem("token");
  await fetch(`${BASE_URL}/logout`, {
    method: "POST",
    headers: { "X-App-Token": token || "" },
  }).catch(() => {});
}

export async function forgotPassword(email) {
  const res = await fetch(`${BASE_URL}/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return res.json();
}

export async function resetPassword(token, newPassword) {
  const res = await fetch(`${BASE_URL}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail || "Reset failed");
  }
  return res.json();
}

export function getUsername() {
  return localStorage.getItem("username");
}

export function getToken() {
  return localStorage.getItem("token");
}

export function isAuthenticated() {
  return !!getToken();
}