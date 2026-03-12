import { useState } from "react";
import { api } from "../../lib/api";
import { useNavigate, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { User, Lock, ArrowRight, ShieldCheck } from "lucide-react";

export default function UserLogin() {
    const nav = useNavigate();
    const qc = useQueryClient();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);

    async function onSubmit(e) {
        e.preventDefault();
        setErr("");
        setLoading(true);
        try {
            await api.post("/api/users/login", { email, password });
            await qc.invalidateQueries({ queryKey: ["user-me"] });
            nav("/user", { replace: true });
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
                        <ShieldCheck size={26} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">User Portal</h1>
                    <p className="text-sm text-slate-600 mt-1">Sign in to your account</p>
                </div>

                <div className="auth-card p-8">
                    <form onSubmit={onSubmit} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5 mb-1.5"><User size={14} /> Email</label>
                            <input type="email" required className="input" value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5 mb-1.5"><Lock size={14} /> Password</label>
                            <input type="password" required className="input" value={password} onChange={e => setPassword(e.target.value)} />
                        </div>

                        {err && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{err}</div>}

                        <button disabled={loading} className="btn btn-primary w-full py-2.5">
                            {loading ? "Signing in..." : "Sign In"} <ArrowRight size={16} />
                        </button>

                        <Link to="/admin/login" className="btn btn-ghost w-full py-2.5">
                            Switch to Admin Login
                        </Link>
                    </form>

                    <div className="mt-6 text-center text-sm text-slate-600">
                        Please contact the administrator to create an account.
                    </div>
                </div>
            </div>
        </div>
    );
}
