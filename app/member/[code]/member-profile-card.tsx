"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Camera, Mail, Phone, Calendar, User, ShieldCheck, Lock, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { updateMemberProfileByCode } from "@/app/actions/member-public.actions";
import { PhotoCapture } from "@/components/shared/photo-capture";

interface MemberProfileCardProps {
  member: {
    fullName: string;
    memberCode: string;
    photoUrl?: string | null;
    email?: string | null;
    phone: string;
    gender?: string;
    joiningDate: Date | string;
    isActive: boolean;
  };
  allowPhotoUpdate: boolean;
  allowEmailUpdate: boolean;
}

export function MemberProfileCard({ member, allowPhotoUpdate, allowEmailUpdate }: MemberProfileCardProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [photoBase64, setPhotoBase64] = useState<string | null>(member.photoUrl ?? null);
  const [email, setEmail] = useState(member.email ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    // Validate Gmail only
    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedEmail !== "" && !trimmedEmail.endsWith("@gmail.com")) {
      setResult({
        type: "error",
        message: "Only Gmail addresses (e.g. yourname@gmail.com) are accepted for member accounts.",
      });
      return;
    }

    setSubmitting(true);
    const res = await updateMemberProfileByCode({
      memberCode: member.memberCode,
      photoUrl: allowPhotoUpdate ? photoBase64 : undefined,
      email: allowEmailUpdate ? (trimmedEmail || null) : undefined,
    });
    setSubmitting(false);

    if (res.success) {
      setResult({ type: "success", message: res.message || "Profile updated successfully!" });
      router.refresh();
      setTimeout(() => {
        setIsOpen(false);
        setResult(null);
      }, 1600);
    } else {
      setResult({ type: "error", message: res.error });
    }
  }

  return (
    <>
      {/* Top Right Corner Member Photo Avatar Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="group relative flex flex-col items-center gap-1.5 focus:outline-none"
        title="Click photo to view details & update profile"
      >
        <div className="relative">
          {member.photoUrl ? (
            <img
              src={member.photoUrl}
              alt={member.fullName}
              className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover shadow-md border-2 border-emerald-500/80 group-hover:border-emerald-400 transition-all transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-zinc-900 text-xl font-bold text-white shadow-md border-2 border-zinc-700 group-hover:border-emerald-400 transition-all transform group-hover:scale-105">
              {member.fullName.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Edit Badge Pill */}
          <div className="absolute -bottom-1 -right-1 rounded-full bg-emerald-600 p-1 text-white shadow-xs group-hover:bg-emerald-500 transition">
            <Camera className="h-3 w-3" />
          </div>
        </div>
        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shadow-2xs group-hover:bg-emerald-100 transition">
          View & Edit
        </span>
      </button>

      {/* Interactive Member Profile & Photo Update Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden text-zinc-900">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 bg-zinc-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-sm">
                  {member.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 text-base">{member.fullName}</h3>
                  <p className="text-xs font-mono text-zinc-500">{member.memberCode}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setResult(null);
                }}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Member Details Summary Grid */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 text-xs">
                <div>
                  <span className="text-zinc-500 font-medium flex items-center gap-1">
                    <Phone className="h-3 w-3 text-zinc-400" /> Phone
                  </span>
                  <div className="font-semibold text-zinc-800 mt-0.5">{member.phone}</div>
                </div>
                <div>
                  <span className="text-zinc-500 font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-zinc-400" /> Member Since
                  </span>
                  <div className="font-semibold text-zinc-800 mt-0.5">
                    {new Date(member.joiningDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <div>
                  <span className="text-zinc-500 font-medium flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-zinc-400" /> Status
                  </span>
                  <div className="font-semibold text-emerald-700 mt-0.5">
                    {member.isActive ? "Active Account" : "Inactive"}
                  </div>
                </div>
                <div>
                  <span className="text-zinc-500 font-medium flex items-center gap-1">
                    <User className="h-3 w-3 text-zinc-400" /> Gender
                  </span>
                  <div className="font-semibold text-zinc-800 mt-0.5 capitalize">
                    {member.gender?.toLowerCase() || "Not specified"}
                  </div>
                </div>
              </div>

              {/* Edit Form */}
              <form onSubmit={handleSave} className="space-y-4">
                {/* Photo Update Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5 text-zinc-600" />
                      <span>Update Profile Photo</span>
                    </label>
                    {!allowPhotoUpdate && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        <Lock className="h-3 w-3" /> Locked by Admin
                      </span>
                    )}
                  </div>

                  {allowPhotoUpdate ? (
                    <div className="rounded-xl border border-zinc-200 p-3 bg-zinc-50/50">
                      <PhotoCapture onChange={setPhotoBase64} initialPhotoUrl={member.photoUrl} />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-zinc-300 p-3.5 text-center text-xs text-zinc-500 bg-zinc-50">
                      Photo modification is locked by the Super Admin.
                    </div>
                  )}
                </div>

                {/* Email Update Section (Gmail Only) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-zinc-600" />
                      <span>Email Address (Gmail Only)</span>
                    </label>
                    {allowEmailUpdate ? (
                      <span className="text-[10px] text-emerald-600 font-medium">@gmail.com required</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        <Lock className="h-3 w-3" /> Locked by Admin
                      </span>
                    )}
                  </div>

                  {allowEmailUpdate ? (
                    <>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="yourname@gmail.com"
                        className="w-full rounded-xl border border-zinc-200 px-3.5 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition"
                      />
                      <p className="text-[11px] text-zinc-400">
                        Adding your Gmail automatically activates instant SMTP payment invoices & membership notifications.
                      </p>
                    </>
                  ) : (
                    <div className="rounded-xl border border-dashed border-zinc-300 p-3.5 text-center text-xs text-zinc-500 bg-zinc-50">
                      Gmail updates are locked by the Super Admin. Current registered Gmail: <strong>{member.email || "None"}</strong>
                    </div>
                  )}
                </div>

                {result && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                      result.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-rose-50 text-rose-800 border border-rose-200"
                    }`}
                  >
                    {result.type === "success" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>{result.message}</div>
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      setResult(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || (!allowPhotoUpdate && !allowEmailUpdate)}
                    className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs transition shadow-xs disabled:opacity-50"
                  >
                    {submitting ? "Saving Updates..." : "Save Profile Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}