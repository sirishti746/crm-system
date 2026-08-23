import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../api/auth";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { token } = await login(username, password);
      localStorage.setItem("token", token);
      localStorage.setItem("username", username);
      navigate("/");
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <form onSubmit={handleSubmit} className="bg-white border border-line rounded-lg shadow-sm p-8 w-full max-w-sm">
        <h1 className="font-display text-xl font-semibold text-ink mb-1">Support CRM</h1>
        <p className="text-sm text-slate mb-6">Sign in to your account.</p>

        <label className="block text-xs font-semibold uppercase tracking-wide text-slate mb-1.5">Username</label>
        <input
          type="text"
          required
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border border-line rounded-md px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
        />

        <label className="block text-xs font-semibold uppercase tracking-wide text-slate mb-1.5">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-line rounded-md px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
        />

        <div className="flex justify-end mb-4">
          <Link to="/forgot-password" className="text-xs text-accent hover:underline">Forgot password?</Link>
        </div>

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-accent text-white py-2 rounded-md text-sm font-medium hover:bg-accent-dark transition-colors disabled:opacity-50"
        >
          {submitting ? "Signing in..." : "Sign In"}
        </button>

        <p className="text-sm text-slate text-center mt-4">
          No account? <Link to="/register" className="text-accent font-medium hover:underline">Create one</Link>
        </p>
      </form>
    </div>
  );
}