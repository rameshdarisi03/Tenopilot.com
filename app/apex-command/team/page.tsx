"use client";

import { useState } from "react";
import { FounderSidebar } from "@/components/founder/FounderSidebar";
import { FounderHeader } from "@/components/founder/FounderHeader";
import {
  Users,
  Plus,
  ShieldCheck,
  UserCheck,
  Mail,
  MapPin,
  Lock,
  Check,
  X,
  Sparkles,
  Key,
  Trash2,
  Edit2,
  AlertCircle,
} from "lucide-react";

interface InternalStaff {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "FIELD_SALES" | "CUSTOMER_SUPPORT" | "BILLING_SPECIALIST";
  territory: string;
  status: "ACTIVE" | "PENDING_INVITE" | "REVOKED";
  joinedDate: string;
}

const INITIAL_TEAM: InternalStaff[] = [
  {
    id: "staff-1",
    name: "Ramesh Darisi",
    email: "admin@tenopilot.com",
    role: "SUPER_ADMIN",
    territory: "All India (Global)",
    status: "ACTIVE",
    joinedDate: "Founder (Active)",
  },
  {
    id: "staff-2",
    name: "Ravi Kumar",
    email: "ravi.sales@tenopilot.com",
    role: "FIELD_SALES",
    territory: "Bangalore (HSR & Koramangala)",
    status: "ACTIVE",
    joinedDate: "2026-08-01",
  },
  {
    id: "staff-3",
    name: "Pooja Hegde",
    email: "pooja.sales@tenopilot.com",
    role: "FIELD_SALES",
    territory: "Hyderabad (Gachibowli & Madhapur)",
    status: "ACTIVE",
    joinedDate: "2026-08-10",
  },
  {
    id: "staff-4",
    name: "Anita Deshmukh",
    email: "anita.support@tenopilot.com",
    role: "CUSTOMER_SUPPORT",
    territory: "Central Ops",
    status: "ACTIVE",
    joinedDate: "2026-08-15",
  },
  {
    id: "staff-5",
    name: "Sanjay Singhania",
    email: "sanjay.finance@tenopilot.com",
    role: "BILLING_SPECIALIST",
    territory: "Finance & Tax Desk",
    status: "ACTIVE",
    joinedDate: "2026-08-20",
  },
];

export default function ApexCommandTeamPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [team, setTeam] = useState<InternalStaff[]>(INITIAL_TEAM);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"SUPER_ADMIN" | "FIELD_SALES" | "CUSTOMER_SUPPORT" | "BILLING_SPECIALIST">("FIELD_SALES");
  const [territory, setTerritory] = useState("Bangalore (Whitefield)");

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleInviteStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      alert("Please fill in all fields.");
      return;
    }

    const newMember: InternalStaff = {
      id: `staff-${Date.now()}`,
      name,
      email: email.toLowerCase().trim(),
      role,
      territory,
      status: "ACTIVE",
      joinedDate: new Date().toISOString().slice(0, 10),
    };

    setTeam([...team, newMember]);
    setShowInviteModal(false);
    setName("");
    setEmail("");
    triggerToast(`✓ Team invitation sent to ${newMember.name} (${newMember.role})!`);
  };

  const handleRevokeStaff = (id: string, staffName: string) => {
    if (confirm(`Are you sure you want to revoke access for ${staffName}?`)) {
      setTeam(team.filter((s) => s.id !== id));
      triggerToast(`✓ Access revoked for ${staffName}`);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0d0f12] text-slate-100 font-sans selection:bg-[#ff3366]/30 selection:text-white">
      <FounderSidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        <FounderHeader
          title="Internal Team & Role-Based Access (RBAC)"
          subtitle="Manage TenoPilot company staff accounts, field sales representatives, and permissions"
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
          actionElement={
            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff3366] via-[#ff5436] to-[#ff8400] hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-[#ff3366]/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Invite Team Member</span>
            </button>
          }
        />

        <main className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 flex-1 max-w-[1400px] mx-auto w-full pb-24">
          {/* Top 4 Role Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-5 rounded-3xl bg-[#16191f] border border-white/8 shadow-xl space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400">TOTAL TEAM</span>
              <h2 className="font-sans font-extrabold text-3xl text-white">{team.length} Members</h2>
              <p className="text-xs text-slate-400">Internal company staff</p>
            </div>

            <div className="p-5 rounded-3xl bg-[#16191f] border border-white/8 shadow-xl space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400">FIELD SALES REPS</span>
              <h2 className="font-sans font-extrabold text-3xl text-[#ff5436]">
                {team.filter((t) => t.role === "FIELD_SALES").length} Reps
              </h2>
              <p className="text-xs text-slate-400">Door-to-door GTM</p>
            </div>

            <div className="p-5 rounded-3xl bg-[#16191f] border border-white/8 shadow-xl space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400">CUSTOMER SUPPORT</span>
              <h2 className="font-sans font-extrabold text-3xl text-blue-400">
                {team.filter((t) => t.role === "CUSTOMER_SUPPORT").length} Staff
              </h2>
              <p className="text-xs text-slate-400">Impersonation & Ops</p>
            </div>

            <div className="p-5 rounded-3xl bg-[#16191f] border border-white/8 shadow-xl space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400">SUPER ADMINS</span>
              <h2 className="font-sans font-extrabold text-3xl text-purple-400">
                {team.filter((t) => t.role === "SUPER_ADMIN").length} Founder
              </h2>
              <p className="text-xs text-slate-400">Master access</p>
            </div>
          </div>

          {/* Team Roster Table */}
          <div className="bg-[#16191f] border border-white/8 rounded-3xl p-4 sm:p-6 md:p-8 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/8 pb-4">
              <div>
                <h3 className="font-serif font-bold text-xl text-white">
                  Company Team Roster
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Employees with restricted access to the Apex Command Console
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {team.length} Active Accounts
              </span>
            </div>

            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="min-w-[760px] w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/8 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-white/2">
                    <th className="py-3 px-4 rounded-l-xl">Team Member</th>
                    <th className="py-3 px-4">Role & Access</th>
                    <th className="py-3 px-4">Assigned Territory</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Joined Date</th>
                    <th className="py-3 px-4 text-right rounded-r-xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6 font-medium">
                  {team.map((staff) => (
                    <tr key={staff.id} className="hover:bg-white/2 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-[#ff3366] flex items-center justify-center text-white font-bold text-xs shrink-0">
                            {staff.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-white">{staff.name}</h4>
                            <p className="text-[10px] text-slate-400 font-mono">{staff.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                            staff.role === "SUPER_ADMIN"
                              ? "bg-purple-500/15 text-purple-400 border-purple-500/30 font-black"
                              : staff.role === "FIELD_SALES"
                              ? "bg-[#ff3366]/15 text-[#ff5436] border-[#ff3366]/30"
                              : staff.role === "CUSTOMER_SUPPORT"
                              ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                              : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          }`}
                        >
                          {staff.role.replace("_", " ")}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#ff5436]" />
                          <span>{staff.territory}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          🟢 ACTIVE
                        </span>
                      </td>

                      <td className="py-4 px-4 text-slate-400 font-mono">
                        {staff.joinedDate}
                      </td>

                      <td className="py-4 px-4 text-right">
                        {staff.role !== "SUPER_ADMIN" && (
                          <button
                            type="button"
                            onClick={() => handleRevokeStaff(staff.id, staff.name)}
                            className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                            title="Revoke access"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Role Permissions Matrix Reference */}
          <div className="bg-[#16191f] border border-white/8 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
            <div className="border-b border-white/8 pb-4">
              <h3 className="font-serif font-bold text-xl text-white">
                Role Permissions & Security Matrix
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Strict separation of sensitive financial metrics and operational tools
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[640px]">
                <thead>
                  <tr className="border-b border-white/8 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-white/2">
                    <th className="py-3 px-4">Feature / Permission</th>
                    <th className="py-3 px-4 text-center text-purple-400">Super Admin (Founder)</th>
                    <th className="py-3 px-4 text-center text-[#ff5436]">Field Sales Rep</th>
                    <th className="py-3 px-4 text-center text-blue-400">Customer Support</th>
                    <th className="py-3 px-4 text-center text-emerald-400">Billing / Finance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6 font-medium">
                  <tr className="hover:bg-white/2">
                    <td className="py-3 px-4 font-bold text-white">View Platform MRR & ARR Financials</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Full Access</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">✕ Hidden</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">✕ Hidden</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ View Only</td>
                  </tr>
                  <tr className="hover:bg-white/2">
                    <td className="py-3 px-4 font-bold text-white">Generate VIP Door-to-Door Invites & Codes</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Full Access</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Full Access</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Full Access</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">✕ Hidden</td>
                  </tr>
                  <tr className="hover:bg-white/2">
                    <td className="py-3 px-4 font-bold text-white">1-Click Client Impersonation (&apos;God Mode&apos;)</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Full Access</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">✕ Restricted</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Full Access</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">✕ Restricted</td>
                  </tr>
                  <tr className="hover:bg-white/2">
                    <td className="py-3 px-4 font-bold text-white">Extend Client Free Trial (+7d / +14d)</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Full Access</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Assigned Only</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Full Access</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">✕ Restricted</td>
                  </tr>
                  <tr className="hover:bg-white/2">
                    <td className="py-3 px-4 font-bold text-white">Manage Global API Keys & Sentry Logs</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Full Access</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">✕ Hidden</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ View Logs</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">✕ Hidden</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* INVITE TEAM MEMBER MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#16191f] rounded-3xl border border-white/10 shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-5 animate-in zoom-in-95 text-xs text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/8">
              <div>
                <h3 className="font-serif font-bold text-xl text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#ff5436]" /> Invite Internal Team Member
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Grant role-restricted access to TenoPilot Apex Console
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInviteStaff} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Vikram Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0f12] border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-[#ff5436]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Company Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. vikram.sales@tenopilot.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0f12] border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-[#ff5436]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Internal Role Tier *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0f12] border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-[#ff5436]"
                >
                  <option value="FIELD_SALES">Field Sales Rep (Door-to-door VIP Invites)</option>
                  <option value="CUSTOMER_SUPPORT">Customer Support & Ops (Impersonation & Trials)</option>
                  <option value="BILLING_SPECIALIST">Billing & Finance Specialist (Invoices & Wallets)</option>
                  <option value="SUPER_ADMIN">Super Admin (Founder Full Master Access)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Assigned City / Territory *
                </label>
                <input
                  type="text"
                  required
                  value={territory}
                  onChange={(e) => setTerritory(e.target.value)}
                  placeholder="e.g. Bangalore (Whitefield)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0f12] border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-[#ff5436]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/8">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ff3366] via-[#ff5436] to-[#ff8400] text-white font-bold shadow-lg cursor-pointer active:scale-95 transition-all"
                >
                  Send Team Invite ➔
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-[#16191f] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-[#ff3366]/40 flex items-center gap-3 max-w-md text-xs font-bold">
            <span className="shrink-0">{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer ml-auto"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
