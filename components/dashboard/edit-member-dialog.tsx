"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoCapture } from "@/components/shared/photo-capture";
import { updateMember } from "@/app/actions/member.actions";

type Props = {
  member: {
    id: string;
    fullName: string;
    email?: string | null;
    phone: string;
    emergencyContact: string;
    joiningDate: Date | string;
    photoUrl?: string | null;
  };
};

export function EditMemberDialog({ member }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [fullName, setFullName] = useState(member.fullName);
  const [email, setEmail] = useState(member.email || "");
  const [phone, setPhone] = useState(member.phone);
  const [emergencyContact, setEmergencyContact] = useState(member.emergencyContact);
  const [joiningDate, setJoiningDate] = useState(() => {
    const d = new Date(member.joiningDate);
    return isNaN(d.getTime()) ? new Date().toISOString().split("T")[0] : d.toISOString().split("T")[0];
  });
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [showPhotoChange, setShowPhotoChange] = useState(false);

  function handleOpen() {
    setFullName(member.fullName);
    setEmail(member.email || "");
    setPhone(member.phone);
    setEmergencyContact(member.emergencyContact);
    const d = new Date(member.joiningDate);
    setJoiningDate(isNaN(d.getTime()) ? new Date().toISOString().split("T")[0] : d.toISOString().split("T")[0]);
    setPhotoBase64(null);
    setShowPhotoChange(false);
    setResult(null);
    setIsOpen(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    const res = await updateMember({
      memberId: member.id,
      fullName: fullName.trim(),
      email: email.trim() || undefined,
      phone: phone.trim(),
      emergencyContact: emergencyContact.trim(),
      joiningDate: new Date(joiningDate),
      photoBase64: photoBase64 ?? undefined,
    });

    setSubmitting(false);

    if (res.success) {
      setResult({ type: "success", message: "Member details updated successfully." });
      setTimeout(() => {
        setIsOpen(false);
        router.refresh();
      }, 900);
    } else {
      setResult({ type: "error", message: res.error });
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen} className="gap-1.5">
        <Edit3 className="h-3.5 w-3.5" /> Edit details
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <Card className="relative w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-100 pb-4">
              <CardTitle className="text-lg">Edit Member Profile</CardTitle>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>

            <CardContent className="overflow-y-auto pt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-fullName">Full Name</Label>
                  <Input
                    id="edit-fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-email">Email Address</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="For receipts & reminders"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-phone">Phone Number</Label>
                    <Input
                      id="edit-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-emergency">Emergency Contact</Label>
                    <Input
                      id="edit-emergency"
                      type="tel"
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-joiningDate">Joining Date (Member Since)</Label>
                    <Input
                      id="edit-joiningDate"
                      type="date"
                      value={joiningDate}
                      onChange={(e) => setJoiningDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="pt-2">
                  {!showPhotoChange ? (
                    <button
                      type="button"
                      onClick={() => setShowPhotoChange(true)}
                      className="text-xs font-medium text-zinc-600 hover:text-zinc-900 underline underline-offset-2"
                    >
                      Change or capture new member photo
                    </button>
                  ) : (
                    <div className="space-y-2 rounded-xl border border-zinc-200 p-3 bg-zinc-50/50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-700">Update Profile Photo</span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowPhotoChange(false);
                            setPhotoBase64(null);
                          }}
                          className="text-xs text-zinc-400 hover:text-zinc-600"
                        >
                          Cancel photo edit
                        </button>
                      </div>
                      <PhotoCapture onChange={setPhotoBase64} />
                    </div>
                  )}
                </div>

                {result && (
                  <div
                    className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${
                      result.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                    }`}
                  >
                    {result.type === "success" ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    <span>{result.message}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
