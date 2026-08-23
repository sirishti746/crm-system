import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { resetPassword } from "../api/auth";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await resetPassword(token, newPassword);
      setDone(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
        <div className="bg-white border border-line rounded-lg shadow-sm p-8 w-full max-w-sm text-center">
          <p className="text-sm text-ink mb-3">This reset link is missing a token.</p>
          <Link to="/forgot-password" className="text-accent text-sm font-medium hover:underline">Request a new link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <form onSubmit={handleSubmit} className="bg-white border border-line rounded-lg shadow-sm p-8 w-full max-w-sm">
        <h1 className="font-display text-xl font-semibold text-ink mb-1">Set New Password</h1>

        {done ? (
          <p className="text-sm text-ink mt-4">Password updated! Redirecting to sign in...</p>
        ) : (
          <>
            <p className="text-sm text-slate mb-6">Choose a new password for your account.</p>
            <input
              type="password"
              required
              minLength={6}
              autoFocus
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-line rounded-md px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            />
            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-accent text-white py-2 rounded-md text-sm font-medium hover:bg-accent-dark transition-colors disabled:opacity-50"
            >
              {submitting ? "Updating..." : "Update Password"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}