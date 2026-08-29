"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  KeyRound,
  Ban,
  CheckCircle2,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  Dices,
  Copy,
  Check,
  X,
  Shield,
} from "lucide-react";
import { updateStaffRole, setStaffStatus, deleteStaffAccount, resetStaffPassword } from "@/app/actions/staff.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

type StaffMember = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "SUPER_ADMIN" | "ADMIN" | "STAFF";
  status: "ACTIVE" | "SUSPENDED";
  createdAt: Date;
  lastLoginAt: Date | null;
};

export function StaffRow({
  staff,
  isCurrentUser,
  currentUserRole,
}: {
  staff: StaffMember;
  isCurrentUser: boolean;
  currentUserRole: "SUPER_ADMIN" | "ADMIN" | "STAFF";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"role" | "status" | "delete" | "password" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Password reset modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // RBAC Permission Logic:
  // 1. Super Admin can manage (role change, suspend, delete) non-super admins.
  const isSuperAdmin = currentUserRole === "SUPER_ADMIN";
  const isAdmin = currentUserRole === "ADMIN";
  const canModifyAccount = isSuperAdmin && !isCurrentUser && staff.role !== "SUPER_ADMIN";

  // 2. Who can reset passwords:
  // - Super Admin can reset ALL passwords (Staff, Admin, and Super Admin)
  // - Admin can reset Staff passwords and own account
  // - Admin CANNOT reset Super Admin or other Admins
  const canResetPassword =
    isSuperAdmin ||
    (isAdmin && (staff.role === "STAFF" || isCurrentUser));

  const passwordDisabledReason =
    isAdmin && staff.role === "SUPER_ADMIN"
      ? "Admins cannot change Super Admin passwords"
      : isAdmin && staff.role === "ADMIN" && !isCurrentUser
      ? "Admins cannot change passwords for other Admins"
      : "Password changes not permitted";

  async function handleRoleChange(newRole: "ADMIN" | "STAFF") {
    setLoading("role");
    setError(null);
    const res = await updateStaffRole({ userId: staff.id, newRole });
    setLoading(null);
    if (!res.success) setError(res.error);
    else router.refresh();
  }

  async function handleToggleStatus() {
    setLoading("status");
    setError(null);
    const newStatus = staff.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const res = await setStaffStatus(staff.id, newStatus);
    setLoading(null);
    if (!res.success) setError(res.error);
    else router.refresh();
  }

  async function handleDelete() {
    const confirmed = window.confirm(`Delete ${staff.name}'s account? They'll no longer be able to log in.`);
    if (!confirmed) return;

    setLoading("delete");
    setError(null);
    const res = await deleteStaffAccount(staff.id);
    setLoading(null);
    if (!res.success) setError(res.error);
    else router.refresh();
  }

  function openResetModal() {
    setNewPassword(generateRandomPassword());
    setResetFeedback(null);
    setCopied(false);
    setResetModalOpen(true);
  }

  async function handleConfirmPasswordReset(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setResetFeedback({ type: "error", message: "Password must be at least 8 characters long." });
      return;
    }

    setLoading("password");
    setResetFeedback(null);
    const res = await resetStaffPassword(staff.id, newPassword);
    setLoading(null);

    if (res.success) {
      setResetFeedback({
        type: "success",
        message: `Permanent password set successfully! ${staff.name} can log in with "${newPassword}" immediately.`,
      });
      router.refresh();
    } else {
      setResetFeedback({ type: "error", message: res.error });
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(newPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <tr className="border-b border-zinc-100 text-sm last:border-0 hover:bg-zinc-50/50 transition-colors">
        <td className="px-4 py-3">
          <p className="font-medium text-zinc-900">
            {staff.name} {isCurrentUser && <span className="text-xs font-normal text-zinc-400">(You)</span>}
          </p>
          <p className="text-xs text-zinc-500">{staff.email}</p>
        </td>
        <td className="px-4 py-3 text-zinc-600">{staff.phone ?? "—"}</td>
        <td className="px-4 py-3">
          {staff.role === "SUPER_ADMIN" ? (
            <span className="rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-medium text-white">Super Admin</span>
          ) : isSuperAdmin ? (
            <select
              value={staff.role}
              disabled={!canModifyAccount || loading === "role"}
              onChange={(e) => handleRoleChange(e.target.value as "ADMIN" | "STAFF")}
              className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs disabled:opacity-60 shadow-sm"
            >
              <option value="ADMIN">Admin</option>
              <option value="STAFF">Staff</option>
            </select>
          ) : (
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium border",
                staff.role === "ADMIN"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-zinc-100 text-zinc-700 border-zinc-200"
              )}
            >
              {staff.role === "ADMIN" ? "Admin" : "Desk Staff"}
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              staff.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            )}
          >
            {staff.status === "ACTIVE" ? "Active" : "Suspended"}
          </span>
        </td>
        <td className="px-4 py-3 text-xs text-zinc-500">
          {staff.lastLoginAt
            ? new Date(staff.lastLoginAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
            : "Never"}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1.5">
            {/* Reset Password Button */}
            {canResetPassword ? (
              <button
                onClick={openResetModal}
                disabled={loading !== null}
                title={`Set permanent password for ${staff.name}`}
                className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors disabled:opacity-40"
              >
                <KeyRound className="h-4 w-4" />
              </button>
            ) : (
              <span
                title={passwordDisabledReason}
                className="p-1.5 text-zinc-300 cursor-not-allowed"
              >
                <KeyRound className="h-4 w-4 opacity-30" />
              </span>
            )}

            {/* Suspend / Reactivate (Super Admin Only) */}
            {isSuperAdmin && (
              <button
                onClick={handleToggleStatus}
                disabled={!canModifyAccount || loading !== null}
                title={
                  !canModifyAccount
                    ? "Cannot change status"
                    : staff.status === "ACTIVE"
                    ? "Suspend account"
                    : "Reactivate account"
                }
                className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {loading === "status" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : staff.status === "ACTIVE" ? (
                  <Ban className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                )}
              </button>
            )}

            {/* Delete Account (Super Admin Only) */}
            {isSuperAdmin && (
              <button
                onClick={handleDelete}
                disabled={!canModifyAccount || loading !== null}
                title={!canModifyAccount ? "Cannot delete this account" : "Delete account"}
                className="rounded-md p-1.5 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {loading === "delete" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
          {error && <p className="mt-1 text-right text-xs text-red-600">{error}</p>}
        </td>
      </tr>

      {/* Password Reset Modal Dialog */}
      {resetModalOpen && (
        <tr>
          <td colSpan={6} className="p-0">
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-zinc-900">Set Permanent Password</h3>
                      <p className="text-xs text-zinc-500">
                        {staff.name} ({staff.email}) · <span className="font-medium text-zinc-700">{staff.role}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setResetModalOpen(false)}
                    className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleConfirmPasswordReset} className="mt-4 space-y-4">
                  {resetFeedback && (
                    <div
                      className={`flex items-start gap-2.5 rounded-lg border p-3 text-sm ${
                        resetFeedback.type === "success"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-red-200 bg-red-50 text-red-800"
                      }`}
                    >
                      {resetFeedback.type === "success" ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      ) : (
                        <Ban className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                      )}
                      <div>{resetFeedback.message}</div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="newStaffPassword">New Permanent Password</Label>
                      <span className="text-xs text-zinc-400">Min. 8 characters</span>
                    </div>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="newStaffPassword"
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          minLength={8}
                          placeholder="Enter new permanent password"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        title="Generate random password"
                        onClick={() => setNewPassword(generateRandomPassword())}
                      >
                        <Dices className="h-4 w-4" />
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        title="Copy password"
                        onClick={copyToClipboard}
                      >
                        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600 border border-zinc-100 flex items-start gap-2">
                    <Shield className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
                    <span>
                      This permanently overrides the user&apos;s password. They will be able to log in with this new password immediately.
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setResetModalOpen(false)}
                      disabled={loading === "password"}
                    >
                      Close
                    </Button>
                    <Button type="submit" disabled={loading === "password"}>
                      {loading === "password" ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating…
                        </>
                      ) : (
                        "Save Permanent Password"
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function generateRandomPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

