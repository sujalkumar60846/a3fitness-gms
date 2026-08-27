"use client";

import { useState } from "react";
import Link from "next/link";
import { UserCheck, Trash2, Phone, Mail, Clock, MapPin, CheckCircle2, UserPlus, Filter } from "lucide-react";
import { updateLeadStatus, deleteLead } from "@/app/actions/lead.actions";
import { Button } from "@/components/ui/button";
import type { Lead, LeadStatus } from "@prisma/client";

export function LeadsView({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [filter, setFilter] = useState<LeadStatus | "ALL">("ALL");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filtered = filter === "ALL" ? leads : leads.filter((l) => l.status === filter);

  async function handleStatusChange(id: string, newStatus: LeadStatus) {
    setLoadingId(id);
    const res = await updateLeadStatus(id, newStatus);
    if (res.success) {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l)));
    }
    setLoadingId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this lead? This action cannot be undone.")) return;
    setLoadingId(id);
    const res = await deleteLead(id);
    if (res.success) {
      setLeads((prev) => prev.filter((l) => l.id !== id));
    }
    setLoadingId(null);
  }

  function getStatusBadge(status: LeadStatus) {
    switch (status) {
      case "PENDING":
        return <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">Pending / Claimed</span>;
      case "CONTACTED":
        return <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">Contacted</span>;
      case "CONVERTED":
        return <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">Converted to Member</span>;
      case "CANCELLED":
        return <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600 border border-zinc-200">Cancelled</span>;
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-zinc-200 shadow-xs">
          {(["ALL", "PENDING", "CONTACTED", "CONVERTED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === s
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              {s === "ALL" ? `All (${leads.length})` : s === "PENDING" ? `Claimed (${leads.filter((l) => l.status === "PENDING").length})` : s}
            </button>
          ))}
        </div>
      </div>

      {/* Leads Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-zinc-500">
            <UserCheck className="mx-auto h-8 w-8 text-zinc-400 mb-2" />
            <p className="text-sm font-medium">No trial leads found.</p>
            <p className="text-xs text-zinc-400 mt-1">When users claim a Free VIP Pass on the website, they will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50/75 text-zinc-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Lead / Name</th>
                  <th className="px-4 py-3">Contact Info</th>
                  <th className="px-4 py-3">Slot / Details</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Claimed Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((lead) => (
                  <tr key={lead.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-zinc-900 text-sm">{lead.fullName}</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">{lead.inquiryType}</div>
                    </td>
                    <td className="px-4 py-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-zinc-800 font-medium">
                        <Phone className="h-3.5 w-3.5 text-zinc-400" />
                        <a href={`tel:${lead.phone}`} className="hover:underline">{lead.phone}</a>
                      </div>
                      {lead.email && (
                        <div className="flex items-center gap-1.5 text-zinc-500">
                          <Mail className="h-3.5 w-3.5 text-zinc-400" />
                          <span>{lead.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 space-y-1">
                      {lead.preferredTime && (
                        <div className="flex items-center gap-1.5 text-zinc-700">
                          <Clock className="h-3.5 w-3.5 text-zinc-400" />
                          <span>{lead.preferredTime}</span>
                        </div>
                      )}
                      {lead.location && (
                        <div className="flex items-center gap-1.5 text-zinc-500">
                          <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                          <span>{lead.location}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(lead.status)}
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                          disabled={loadingId === lead.id}
                          className="text-[11px] rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-zinc-700 focus:outline-none"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="CONTACTED">Contacted</option>
                          <option value="CONVERTED">Converted</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-zinc-500">
                      {new Date(lead.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Convert to Member Button */}
                        <Link
                          href={`/dashboard/members/new?name=${encodeURIComponent(lead.fullName)}&phone=${encodeURIComponent(lead.phone)}&email=${encodeURIComponent(lead.email || "")}&leadId=${lead.id}`}
                          onClick={() => handleStatusChange(lead.id, "CONVERTED")}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 text-xs font-semibold shadow-xs transition"
                          title="Register this lead as an official gym member"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          <span>Convert to Member</span>
                        </Link>

                        {/* Delete Lead Button */}
                        <button
                          onClick={() => handleDelete(lead.id)}
                          disabled={loadingId === lead.id}
                          className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-zinc-400 hover:text-rose-600 p-1.5 transition"
                          title="Delete lead record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}