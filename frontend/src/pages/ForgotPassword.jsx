import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../api/auth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    await forgotPassword(email);
    setSubmitting(false);
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="bg-white border border-line rounded-lg shadow-sm p-8 w-full max-w-sm">
        <h1 className="font-display text-xl font-semibold text-ink mb-1">Reset Password</h1>
        <p className="text-sm text-slate mb-6">Enter your email and we'll send a reset link.</p>

        {submitted ? (
          <p className="text-sm text-ink">
            If that email is registered, a reset link has been sent. Check your inbox.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              required
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-line rounded-md px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-accent text-white py-2 rounded-md text-sm font-medium hover:bg-accent-dark transition-colors disabled:opacity-50"
            >
              {submitting ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <p className="text-sm text-slate text-center mt-4">
          <Link to="/login" className="text-accent font-medium hover:underline">← Back to sign in</Link>
        </p>
      </div>
    </div>
  );
} 