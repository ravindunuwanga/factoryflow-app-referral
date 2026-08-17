"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Users, 
  Search, 
  UserPlus, 
  MoreVertical, 
  ShieldCheck, 
  ShieldAlert, 
  Trash2, 
  Phone, 
  Fingerprint,
  Mail,
  Lock,
  Loader2,
  X
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import GlassCard from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

interface StaffMember {
  id: string;
  full_name: string | null;
  nic_number: string | null;
  phone_number: string | null;
  role: string;
  updated_at: string;
}

export default function StaffManagementPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [isProvisioning, setIsProvisioning] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: "",
    email: "",
    password: "",
    role: "operator",
    nic: "",
    phone: ""
  });

  useEffect(() => {
    const guardRoute = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace('/login');
      
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      
      // 1. Explicitly Block Unauthorized Roles from this HUB
      const forbidden = ['driver', 'operator', 'inspector'];
      if (profile && forbidden.includes(profile.role)) {
        supabase.auth.signOut().then(() => {
          router.replace('/login');
        });
        return;
      }
    };

    guardRoute();
    fetchStaff();

    // REAL-TIME MISSION SYNC
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          fetchStaff();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'admin')
        .order('full_name');
      
      if (error) throw error;
      if (data) setStaff(data);
    } catch (error) {
      console.error('Personnel fetch failure:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeProvisioning = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // In a production master system, we'd use service role to create Auth user.
      // For this terminal, we provision the PROFILE which triggers the enterprise invite.
      const tempId = crypto.randomUUID();
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: tempId,
          full_name: newStaff.name,
          role: newStaff.role as any,
          nic_number: newStaff.nic || null,
          phone_number: newStaff.phone || null,
        });

      if (error) throw error;

      // Log the provisioning event
      await supabase.from('notifications').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        title: "Personnel Provisioned",
        message: `${newStaff.name} has been added to the matrix as ${newStaff.role.toUpperCase()}.`,
        type: 'success'
      });

      setIsProvisioning(false);
      setNewStaff({ name: "", email: "", password: "", role: "operator", nic: "", phone: "" });
      fetchStaff();
    } catch (error: any) {
      alert("Provisioning Failure: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (id: string, newRole: string) => {
    setUpdatingId(id);
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', id);
    
    if (!error) {
      setStaff(prev => prev.map(s => s.id === id ? { ...s, role: newRole } : s));
    }
    setUpdatingId(null);
  };

  const removeStaff = async (id: string) => {
    if (!confirm("Are you sure you want to decommission this staff member? This action is permanent.")) return;

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (!error) {
      setStaff(prev => prev.filter(s => s.id !== id));
    }
  };

  const filteredStaff = staff.filter(s => 
    s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.nic_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-10 relative">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white mb-2 uppercase italic">Personnel Governance</h2>
          <p className="text-neutral-500 font-medium tracking-tight uppercase text-[10px] tracking-widest">Administrative Control over Enterprise Workforce</p>
        </div>
        <button 
          onClick={() => setIsProvisioning(true)}
          className="btn-primary !px-6 flex items-center gap-2 border border-white/10 shadow-[0_20px_40px_-10px_rgba(59,130,246,0.3)]"
        >
          <UserPlus size={18} /> Provision New Staff
        </button>
      </section>

      {/* Provisioning Terminal Modal */}
      {isProvisioning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <GlassCard className="w-full max-w-xl !p-8 border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <button 
                onClick={() => setIsProvisioning(false)}
                className="text-neutral-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
                <UserPlus size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Provisioning Terminal</h3>
                <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">Enroll New Enterprise Personnel</p>
              </div>
            </div>

            <form onSubmit={executeProvisioning} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Full Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Kamal Perera"
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Identity (SL NIC)</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. 199512345678"
                    value={newStaff.nic}
                    onChange={(e) => setNewStaff({...newStaff, nic: e.target.value})}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Work Email</label>
                  <input 
                    type="email" 
                    placeholder="staff@factoryflow.com"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Phone Number</label>
                  <input 
                    type="tel" 
                    placeholder="+94 77 XXX XXXX"
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff({...newStaff, phone: e.target.value})}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Initial Password</label>
                <div className="relative group">
                   <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-white transition-colors" size={16} />
                   <input 
                     type="password" 
                     required
                     placeholder="Assign secure password"
                     value={newStaff.password}
                     onChange={(e) => setNewStaff({...newStaff, password: e.target.value})}
                     className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all"
                   />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Enterprise Role</label>
                <select 
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/30 cursor-pointer uppercase font-black"
                >
                  <option value="admin" className="bg-neutral-900">ADMIN (Governance)</option>
                  <option value="supervisor" className="bg-neutral-900">SUPERVISOR (Floor Lead)</option>
                  <option value="logistics" className="bg-neutral-900">LOGISTICS (Fleet Manager)</option>
                  <option value="inventory" className="bg-neutral-900">INVENTORY (Stock/Supply)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-white/5 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsProvisioning(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-[2] btn-primary py-3 px-4 rounded-xl flex items-center justify-center gap-2 group border border-white/10"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <>
                      <ShieldCheck size={16} /> Enroll Member
                    </>
                  )}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      <GlassCard className="!p-0 overflow-hidden border-white/5 shadow-2xl">
        <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/[0.01]">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
            <input 
              type="text" 
              placeholder="Search by Name or NIC..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/30 w-full"
            />
          </div>
          <div className="flex items-center gap-2">
             <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
               Total Personnel: {staff.length}
             </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.02] text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500 border-b border-white/5">
                <th className="px-6 py-5">Identity (SL NIC)</th>
                <th className="px-6 py-5">Full Name</th>
                <th className="px-6 py-5">Enterprise Role</th>
                <th className="px-6 py-5">Contact Details</th>
                <th className="px-6 py-5 text-right">Operational Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                   <td colSpan={5} className="py-20 text-center">
                     <Loader2 className="animate-spin inline text-blue-500 mb-4" size={32} />
                     <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">Retrieving Personnel Data...</p>
                   </td>
                </tr>
              ) : filteredStaff.map((member) => (
                <tr key={member.id} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                       <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-neutral-500">
                          <Fingerprint size={16} />
                       </div>
                       <p className="text-sm font-black text-white tracking-widest uppercase">{member.nic_number || "PENDING"}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-black text-white uppercase italic">{member.full_name}</p>
                    <p className="text-[9px] text-neutral-500 font-mono mt-1 opacity-50 group-hover:opacity-100 transition-opacity uppercase">{member.id}</p>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                       <select 
                         disabled={updatingId === member.id}
                         value={member.role}
                         onChange={(e) => updateRole(member.id, e.target.value)}
                         className={cn(
                           "bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-blue-500/50 cursor-pointer",
                           member.role === 'admin' ? "text-red-400" : 
                           member.role === 'logistics' ? "text-green-400" :
                           member.role === 'inventory' ? "text-yellow-400" :
                           member.role === 'inspector' ? "text-purple-400" :
                           "text-neutral-400"
                         )}
                       >
                         <option value="admin" className="bg-neutral-900">ADMIN</option>
                         <option value="supervisor" className="bg-neutral-900">SUPERVISOR</option>
                         <option value="logistics" className="bg-neutral-900">LOGISTICS</option>
                         <option value="inventory" className="bg-neutral-900">INVENTORY</option>
                       </select>
                       {updatingId === member.id && <Loader2 size={12} className="animate-spin text-blue-500" />}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1">
                       <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-bold">
                          <Phone size={10} /> {member.phone_number || "N/A"}
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button 
                      onClick={() => removeStaff(member.id)}
                      className="p-2 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-lg text-red-500 transition-all opacity-0 group-hover:opacity-100"
                      title="Decommission Staff"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
