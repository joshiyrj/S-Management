import { useState } from "react";
import { api } from "../../lib/api";
import { useNavigate, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Lock, User, ArrowRight, Shield } from "lucide-react";

export default function AdminLogin() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await api.post("/api/auth/login", { username, password });
      await qc.invalidateQueries({ queryKey: ["admin-me"] });
      nav("/admin", { replace: true });
    } catch (e) {
      setErr(e?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 text-white"
            style={{ background: "linear-gradient(135deg, #1f4b99 0%, #2f6ad8 100%)" }}
          >
            <Shield size={26} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Access</h1>
          <p className="text-sm text-slate-600 mt-1">Sign in to continue</p>
        </div>

        <div className="auth-card p-8">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5 mb-1.5">
                <User size={14} /> Username
              </label>
              <input
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5 mb-1.5">
                <Lock size={14} /> Password
              </label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {err && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{err}</div>}

            <button disabled={loading} className="btn btn-primary w-full py-2.5">
              {loading ? "Signing in..." : "Sign In"}
              <ArrowRight size={16} />
            </button>

            <Link to="/user/login" className="btn btn-ghost w-full py-2.5">
              Switch to User Login
            </Link>
          </form>

          <div className="mt-5 text-xs text-slate-500 text-center">Use your configured admin credentials</div>
        </div>
      </div>
    </div>
  );
}
