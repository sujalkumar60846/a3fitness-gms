"use client";

import { useState } from "react";
import {
  Send,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Search,
  CheckSquare,
  Square,
  Eye,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sendBroadcastMessage } from "@/app/actions/broadcast.actions";

type Recipient = {
  id: string;
  fullName: string;
  memberCode: string;
  email: string | null;
  phone: string;
  isExpired: boolean;
  hasEmail: boolean;
};

const TEMPLATES = [
  {
    name: "Special Renewal Discount",
    subject: "Special Membership Renewal Offer for {name} | {gymName}",
    body: "We have an exclusive membership renewal discount available for you this week!\n\nRenew your plan early and get special discounted rates. Visit our reception counter or contact us today to claim your offer.",
  },
  {
    name: "Holiday Schedule Notice",
    subject: "Holiday Operating Hours Notice — {gymName}",
    body: "Please note that {gymName} will operate on modified hours during the upcoming holiday:\n\nMorning Sessions: 06:00 AM - 11:00 AM\nEvening Sessions: Closed\n\nRegular training schedules will resume the following day.",
  },
  {
    name: "New Equipment / Facility Update",
    subject: "Exciting New Equipment & Upgrades at {gymName}!",
    body: "We are thrilled to announce that new training equipment and upgrades have just arrived at {gymName}.\n\nCome check out the new machines and elevate your workout routine with us this week!",
  },
  {
    name: "Weekly Fitness Motivation",
    subject: "Stay Consistent & Crush Your Fitness Goals, {name}!",
    body: "Consistency is key to reaching your fitness goals! Don't let your routine slip.\n\nWe look forward to seeing you at your next training session this week at {gymName}.",
  },
];

export function BroadcastForm({
  recipients,
  gymName,
}: {
  recipients: Recipient[];
  gymName: string;
}) {
  const [audience, setAudience] = useState<"ALL_ACTIVE" | "ALL_EXPIRED" | "ALL_MEMBERS" | "SELECTED">("ALL_ACTIVE");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [activeTab, setActiveTab] = useState<"compose" | "preview">("compose");

  const [submitting, setSubmitting] = useState(false);
  const [sendResult, setSendResult] = useState<{
    totalTargeted: number;
    totalSent: number;
    totalFailed: number;
    recipients: { name: string; email: string; status: "SENT" | "FAILED" | "NO_EMAIL" }[];
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filteredMembers = recipients.filter(
    (m) =>
      m.fullName.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.memberCode.toLowerCase().includes(memberSearch.toLowerCase()) ||
      (m.email && m.email.toLowerCase().includes(memberSearch.toLowerCase()))
  );

  const activeCount = recipients.filter((m) => !m.isExpired).length;
  const expiredCount = recipients.filter((m) => m.isExpired).length;
  const totalCount = recipients.length;

  const targetCount =
    audience === "ALL_ACTIVE"
      ? activeCount
      : audience === "ALL_EXPIRED"
      ? expiredCount
      : audience === "ALL_MEMBERS"
      ? totalCount
      : selectedIds.length;

  function handleSelectAll() {
    setSelectedIds(filteredMembers.map((m) => m.id));
  }

  function handleClearAll() {
    setSelectedIds([]);
  }

  function toggleMember(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function applyTemplate(tpl: typeof TEMPLATES[0]) {
    setSubject(tpl.subject);
    setMessageBody(tpl.body);
  }

  function insertVariable(varName: string) {
    setMessageBody((prev) => prev + varName);
  }

  async function handleSend() {
    if (!subject.trim()) {
      setErrorMessage("Please enter a subject line.");
      return;
    }
    if (!messageBody.trim()) {
      setErrorMessage("Please enter message content.");
      return;
    }
    if (audience === "SELECTED" && selectedIds.length === 0) {
      setErrorMessage("Please select at least one member to receive the message.");
      return;
    }

    const confirmMsg = `Send broadcast message to ${targetCount} member(s)?`;
    if (!window.confirm(confirmMsg)) return;

    setSubmitting(true);
    setErrorMessage(null);
    setSendResult(null);

    const res = await sendBroadcastMessage({
      audience,
      memberIds: audience === "SELECTED" ? selectedIds : undefined,
      subject,
      messageBody,
    });

    setSubmitting(false);

    if (res.success && res.data) {
      setSendResult(res.data);
    } else {
      setErrorMessage(res.success ? "Unknown error" : res.error);
    }
  }

  // Preview sample calculation
  const sampleMember = recipients[0] || {
    fullName: "Alex Johnson",
    memberCode: "GYM-8K4W9P",
    email: "alex@example.com",
    phone: "9876543210",
  };

  const previewSubject = subject
    ? subject
        .replace(/{name}/g, sampleMember.fullName)
        .replace(/{memberCode}/g, sampleMember.memberCode)
        .replace(/{gymName}/g, gymName)
    : "Subject line will appear here";

  const previewBody = messageBody
    ? messageBody
        .replace(/{name}/g, sampleMember.fullName)
        .replace(/{memberCode}/g, sampleMember.memberCode)
        .replace(/{gymName}/g, gymName)
        .replace(/{phone}/g, sampleMember.phone)
        .replace(/\n/g, "<br/>")
    : "Your message content will appear here...";

  return (
    <div className="space-y-6">
      {/* Audience Selector Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-zinc-700" /> Target Audience
            </span>
            <span className="text-xs font-normal text-zinc-500">
              Targeting: <strong className="text-zinc-900">{targetCount} members</strong>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => setAudience("ALL_ACTIVE")}
              className={`rounded-xl border p-3 text-left transition-all ${
                audience === "ALL_ACTIVE"
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              <div className="text-xs font-semibold">Active Members</div>
              <div className={`mt-1 text-sm font-bold ${audience === "ALL_ACTIVE" ? "text-emerald-400" : "text-emerald-600"}`}>
                {activeCount} members
              </div>
            </button>

            <button
              type="button"
              onClick={() => setAudience("ALL_EXPIRED")}
              className={`rounded-xl border p-3 text-left transition-all ${
                audience === "ALL_EXPIRED"
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              <div className="text-xs font-semibold">Expired Members</div>
              <div className={`mt-1 text-sm font-bold ${audience === "ALL_EXPIRED" ? "text-rose-400" : "text-rose-600"}`}>
                {expiredCount} members
              </div>
            </button>

            <button
              type="button"
              onClick={() => setAudience("ALL_MEMBERS")}
              className={`rounded-xl border p-3 text-left transition-all ${
                audience === "ALL_MEMBERS"
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              <div className="text-xs font-semibold">All Members</div>
              <div className={`mt-1 text-sm font-bold ${audience === "ALL_MEMBERS" ? "text-zinc-200" : "text-zinc-900"}`}>
                {totalCount} members
              </div>
            </button>

            <button
              type="button"
              onClick={() => setAudience("SELECTED")}
              className={`rounded-xl border p-3 text-left transition-all ${
                audience === "SELECTED"
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              <div className="text-xs font-semibold">Custom Selection</div>
              <div className={`mt-1 text-sm font-bold ${audience === "SELECTED" ? "text-blue-400" : "text-blue-600"}`}>
                {selectedIds.length} selected
              </div>
            </button>
          </div>

          {/* Member Picker when SELECTED */}
          {audience === "SELECTED" && (
            <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-200">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                  <Input
                    placeholder="Search by name, code, or email..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="pl-8 text-xs bg-white"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleSelectAll} className="text-xs">
                    Select All
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={handleClearAll} className="text-xs">
                    Clear
                  </Button>
                </div>
              </div>

              <div className="mt-3 max-h-56 overflow-y-auto divide-y divide-zinc-200/70">
                {filteredMembers.length === 0 ? (
                  <p className="py-4 text-center text-xs text-zinc-500">No members match search.</p>
                ) : (
                  filteredMembers.map((m) => {
                    const isChecked = selectedIds.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => toggleMember(m.id)}
                        className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-zinc-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4 text-zinc-900" />
                          ) : (
                            <Square className="h-4 w-4 text-zinc-400" />
                          )}
                          <div>
                            <p className="text-xs font-semibold text-zinc-900">{m.fullName}</p>
                            <p className="text-[10px] text-zinc-500">
                              {m.memberCode} · {m.email || "No Email"}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            m.isExpired ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                          }`}
                        >
                          {m.isExpired ? "Expired" : "Active"}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preset Draft Templates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-zinc-700" /> Quick Message Drafts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.name}
                type="button"
                onClick={() => applyTemplate(tpl)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-100 hover:border-zinc-300"
              >
                {tpl.name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Compose & Live Preview */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Message Content</CardTitle>
            <div className="flex rounded-lg bg-zinc-100 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab("compose")}
                className={`px-3 py-1 rounded-md transition ${activeTab === "compose" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"}`}
              >
                Compose
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1 rounded-md transition ${activeTab === "preview" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"}`}
              >
                <Eye className="inline h-3 w-3 mr-1" /> Live Preview
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeTab === "compose" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="subject">Subject Line</Label>
                <Input
                  id="subject"
                  placeholder="e.g. Special Holiday Hours / Exclusive Renewal Discount"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="message">Message Body</Label>
                  <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                    <span>Insert variable:</span>
                    {(["{name}", "{memberCode}", "{gymName}"] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insertVariable(v)}
                        className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-zinc-800 hover:bg-zinc-200"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  id="message"
                  rows={6}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Type your message here. Line breaks and paragraphs will be preserved..."
                  className="w-full rounded-lg border border-zinc-200 p-3 text-sm focus:border-zinc-900 focus:outline-none"
                />
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5">
              <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
                <div className="bg-zinc-900 text-white p-4 text-center">
                  <h3 className="font-semibold text-sm">{gymName}</h3>
                </div>
                <div className="p-5 text-sm space-y-3">
                  <p className="font-bold text-zinc-900 text-xs border-b pb-2">Subject: {previewSubject}</p>
                  <p className="text-xs text-zinc-600">Hi <strong>{sampleMember.fullName}</strong>,</p>
                  <div
                    className="text-xs text-zinc-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: previewBody }}
                  />
                </div>
                <div className="bg-zinc-50 p-3 text-center text-[10px] text-zinc-400 border-t">
                  Sent from {gymName} administration
                </div>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={handleSend} disabled={submitting} className="gap-2">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Dispatching Broadcast…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Send Broadcast to {targetCount} Member{targetCount === 1 ? "" : "s"}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Broadcast Result Summary */}
      {sendResult && (
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-emerald-800">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Broadcast Dispatched Successfully!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-white p-3 border border-emerald-200">
                <p className="text-xs text-zinc-500">Targeted</p>
                <p className="text-lg font-bold text-zinc-900">{sendResult.totalTargeted}</p>
              </div>
              <div className="rounded-lg bg-white p-3 border border-emerald-200">
                <p className="text-xs text-zinc-500">Delivered</p>
                <p className="text-lg font-bold text-emerald-600">{sendResult.totalSent}</p>
              </div>
              <div className="rounded-lg bg-white p-3 border border-emerald-200">
                <p className="text-xs text-zinc-500">No Email / Skipped</p>
                <p className="text-lg font-bold text-zinc-600">{sendResult.totalFailed + (sendResult.totalTargeted - sendResult.totalSent)}</p>
              </div>
            </div>

            <div className="mt-3 max-h-48 overflow-y-auto divide-y divide-zinc-200 text-xs bg-white rounded-lg border border-emerald-100 p-2">
              {sendResult.recipients.map((r, idx) => (
                <div key={idx} className="flex items-center justify-between py-1.5 px-2">
                  <span className="font-medium text-zinc-800">{r.name}</span>
                  <span
                    className={`font-mono text-[10px] px-2 py-0.5 rounded ${
                      r.status === "SENT"
                        ? "bg-emerald-100 text-emerald-800"
                        : r.status === "NO_EMAIL"
                        ? "bg-zinc-100 text-zinc-600"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
