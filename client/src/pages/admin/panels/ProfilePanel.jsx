import { useState } from "react";
import { useAdminAuth } from "../useAdminAuth";
import { api } from "../../../lib/api";
import { useQueryClient } from "@tanstack/react-query";

export default function ProfilePanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useAdminAuth();

  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });

  if (isLoading) return <div className="text-slate-500">Loading...</div>;

  const current = form || data;

  async function saveProfile() {
    setMsg("");
    setPwMsg("");

    if (!current.name?.trim()) {
      setMsg("Name is required.");
      return;
    }
    if (!current.mobile?.trim() || current.mobile.trim().length < 8) {
      setMsg("Mobile is required (minimum 8 digits).");
      return;
    }

    try {
      await api.put("/api/admin/profile", {
        name: current.name,
        email: current.email,
        mobile: current.mobile
      });
      setMsg("Profile updated successfully.");
      qc.invalidateQueries({ queryKey: ["admin-me"] });
      setForm(null);
    } catch (e) {
      setMsg(e?.response?.data?.message || "Failed to update profile.");
    }
  }

  async function changePassword() {
    setPwMsg("");

    if (!pw.currentPassword || !pw.newPassword) {
      setPwMsg("Both current and new password are required.");
      return;
    }
    if (pw.newPassword.length < 4) {
      setPwMsg("New password must be at least 4 characters.");
      return;
    }

    try {
      await api.put("/api/admin/profile/password", pw);
      setPwMsg("Password updated successfully.");
      setPw({ currentPassword: "", newPassword: "" });
    } catch (e) {
      setPwMsg(e?.response?.data?.message || "Failed to update password.");
    }
  }

  return (
    <div className="space-y-8">
      <section className="card card-pad">
        <h2 className="page-title">Admin Profile</h2>
        <p className="page-subtitle">Edit name, email, and mobile.</p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Name" value={current.name} onChange={(v) => setForm({ ...(current), name: v })} />
          <Field label="Email" value={current.email} onChange={(v) => setForm({ ...(current), email: v })} />
          <Field label="Mobile" value={current.mobile} onChange={(v) => setForm({ ...(current), mobile: v })} />
          <div className="panel-muted-box rounded-xl border px-3 py-2">
            <div className="text-xs text-slate-500">Username</div>
            <div className="mt-1 font-medium text-slate-900">{data.username}</div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={saveProfile}
            className="btn btn-primary"
          >
            Save Profile
          </button>
          {msg && <span className="inline-success text-sm">{msg}</span>}
        </div>
      </section>

      <section className="card card-pad">
        <h2 className="page-title">Change Password</h2>
        <p className="page-subtitle">Use current password to set a new one.</p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Current Password"
            type="password"
            value={pw.currentPassword}
            onChange={(v) => setPw({ ...pw, currentPassword: v })}
          />
          <Field
            label="New Password"
            type="password"
            value={pw.newPassword}
            onChange={(v) => setPw({ ...pw, newPassword: v })}
          />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={changePassword}
            className="btn btn-ghost"
          >
            Update Password
          </button>
          {pwMsg && <span className="inline-danger text-sm">{pwMsg}</span>}
        </div>

      </section>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="input mt-1"
        required
      />
    </div>
  );
}
