import { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { logout, getUsername } from "../api/auth";

const linkClass = ({ isActive }) =>
  `px-1 py-1.5 text-sm font-medium border-b-2 transition-colors ${
    isActive ? "text-ink border-accent" : "text-slate border-transparent hover:text-ink"
  }`;

function ProfileMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const username = getUsername() || "Admin";
  const initial = username.charAt(0).toUpperCase();

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  function handleResetPassword() {
    setOpen(false);
    navigate("/forgot-password");
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border border-line hover:bg-canvas transition-colors"
      >
        <span className="w-7 h-7 rounded-full bg-accent text-white text-xs font-semibold flex items-center justify-center">
          {initial}
        </span>
        <span className="text-sm font-medium text-ink">Hi, {username}</span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          className={`text-slate transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-line rounded-lg shadow-lg py-1 z-20">
          <div className="px-3 py-2 border-b border-line">
            <p className="text-xs text-slate">Signed in as</p>
            <p className="text-sm font-medium text-ink truncate">{username}</p>
          </div>
          <button
            onClick={handleResetPassword}
            className="w-full text-left px-3 py-2 text-sm text-ink hover:bg-canvas transition-colors"
          >
            Reset password
          </button>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-line">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-accent flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            </span>
            <span className="font-display font-semibold text-ink tracking-tight">Support CRM</span>
          </div>
          <div className="hidden sm:flex items-center gap-6">
            <NavLink to="/" end className={linkClass}>Dashboard</NavLink>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <NavLink
            to="/import"
            className="bg-white border border-line text-ink px-4 py-2 rounded-md text-sm font-medium hover:bg-canvas transition-colors"
          >
            Import File
          </NavLink>
          <NavLink
            to="/create"
            className="bg-accent text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-accent-dark transition-colors"
          >
            + New Ticket
          </NavLink>
          <ProfileMenu />
        </div>
      </div>
    </nav>
  );
}