import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api/auth";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { token } = await register(form.username, form.email, form.password);
      localStorage.setItem("token", token);
      navigate("/");
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <form onSubmit={handleSubmit} className="bg-white border border-line rounded-lg shadow-sm p-8 w-full max-w-sm">
        <h1 className="font-display text-xl font-semibold text-ink mb-1">Create Account</h1>
        <p className="text-sm text-slate mb-6">Set up your Support CRM login.</p>

        <label className="block text-xs font-semibold uppercase tracking-wide text-slate mb-1.5">Username</label>
        <input
          type="text"
          required
          value={form.username}
          onChange={(e) => update("username", e.target.value)}
          className="w-full border border-line rounded-md px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
        />

        <label className="block text-xs font-semibold uppercase tracking-wide text-slate mb-1.5">Email</label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          className="w-full border border-line rounded-md px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
        />

        <label className="block text-xs font-semibold uppercase tracking-wide text-slate mb-1.5">Password</label>
        <input
          type="password"
          required
          minLength={6}
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          className="w-full border border-line rounded-md px-3 py-2 text-sm mb-1 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
        />
        <p className="text-xs text-slate mb-4">At least 6 characters.</p>

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-accent text-white py-2 rounded-md text-sm font-medium hover:bg-accent-dark transition-colors disabled:opacity-50"
        >
          {submitting ? "Creating account..." : "Create Account"}
        </button>

        <p className="text-sm text-slate text-center mt-4">
          Already have an account? <Link to="/login" className="text-accent font-medium hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  );
}