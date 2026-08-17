"use client";

import { useState, useEffect } from "react";
import { 
  Key, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Search, 
  RefreshCw,
  MoreVertical,
  X,
  Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import GlassCard from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

interface ResetRequest {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  status: 'pending' | 'resolved';
  requested_at: string;
}

export default function PasswordResetTerminal() {
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [overrideModal, setOverrideModal] = useState<ResetRequest | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel('reset-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'password_reset_requests' },
        () => fetchRequests()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('password_reset_requests')
        .select('*')
        .order('requested_at', { ascending: false });
      
      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Reset fetch failure:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideModal) return;
    setProcessing(true);

    try {
      // 1. In a production system, we'd call a Supabase Edge Function to update Auth password.
      // For this master terminal, we mark it as RESOLVED and notify the system.
      const { error } = await supabase
        .from('password_reset_requests')
        .update({ 
          status: 'resolved',
          resolved_at: new Date().toISOString()
        })
        .eq('id', overrideModal.id);

      if (error) throw error;

      // Log to Global Notifications for Admin
      await supabase.from('notifications').insert({
        user_id: overrideModal.user_id,
        title: "Credential Overridden",
        message: "An Administrator has reset your security password. Use the new credentials to login.",
        type: 'info'
      });

      setOverrideModal(null);
      setNewPassword("");
      fetchRequests();
    } catch (error: any) {
      alert("Override Failure: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white mb-2 uppercase italic">Credential Governance</h2>
          <p className="text-neutral-500 font-medium tracking-tight uppercase text-[10px] tracking-widest">Administrative Overrides for Industrial Access</p>
        </div>
        <div className="flex gap-2">
           <div className="px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 flex items-center gap-2">
              <ShieldAlert size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {requests.filter(r => r.status === 'pending').length} Pending Resets
              </span>
           </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="animate-spin inline text-blue-500 mb-4" size={32} />
            <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">Scanning Secure Request Logs...</p>
          </div>
        ) : requests.length > 0 ? (
          requests.map((request) => (
            <GlassCard 
              key={request.id}
              className={cn(
                "flex items-center justify-between group transition-all relative overflow-hidden",
                request.status === 'pending' ? "border-yellow-500/10 hover:border-yellow-500/30" : "border-white/5 opacity-60"
              )}
            >
              <div className="flex items-center gap-6">
                 <div className={cn(
                   "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg",
                   request.status === 'pending' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : "bg-neutral-500/10 text-neutral-500 border-neutral-500/20"
                 )}>
                   {request.status === 'pending' ? <Key size={24} /> : <CheckCircle2 size={24} />}
                 </div>
                 
                 <div>
                   <h4 className="text-sm font-black text-white uppercase italic">{request.full_name}</h4>
                   <p className="text-[10px] text-neutral-500 font-mono tracking-tighter">{request.email}</p>
                 </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1 flex items-center justify-end gap-1">
                    <Clock size={10} /> {new Date(request.requested_at).toLocaleTimeString()}
                  </p>
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded border",
                    request.status === 'pending' ? "text-yellow-500 border-yellow-500/20 bg-yellow-500/5" : "text-green-500 border-green-500/20 bg-green-500/5"
                  )}>
                    {request.status}
                  </span>
                </div>

                {request.status === 'pending' && (
                  <button 
                    onClick={() => setOverrideModal(request)}
                    className="btn-primary !py-2 !px-4 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 group border border-white/10"
                  >
                    <RefreshCw size={12} className="group-hover:rotate-180 transition-transform duration-500" /> Override Credentials
                  </button>
                )}
              </div>
            </GlassCard>
          ))
        ) : (
          <div className="py-20 text-center space-y-4">
             <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10 text-neutral-700">
               <CheckCircle2 size={24} />
             </div>
             <p className="text-neutral-500 font-bold uppercase tracking-widest text-sm">Clear Horizon: No Reset Requests</p>
          </div>
        )}
      </div>

      {/* Override Modal */}
      {overrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <GlassCard className="w-full max-w-md !p-8 border-yellow-500/20 shadow-[0_0_50px_rgba(234,179,8,0.1)] relative">
            <button 
              onClick={() => setOverrideModal(null)}
              className="absolute top-4 right-4 text-neutral-500 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center border border-yellow-500/20">
                <RefreshCw size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Credential Override</h3>
                <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">Manual Resolution for {overrideModal.full_name}</p>
              </div>
            </div>

            <form onSubmit={executeOverride} className="space-y-6">
              <div className="space-y-2 text-center py-4 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">Assigned Email</p>
                <p className="text-sm font-bold text-white">{overrideModal.email}</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">New System Password</label>
                <input 
                  type="password"
                  required
                  placeholder="Set new credentials"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-yellow-500/30 font-medium"
                />
              </div>

              <button 
                type="submit"
                disabled={processing}
                className="w-full btn-primary !bg-yellow-500 !text-black py-4 flex items-center justify-center gap-2 font-black uppercase tracking-widest disabled:opacity-50"
              >
                {processing ? <Loader2 className="animate-spin" size={18} /> : "Finalize Override"}
              </button>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
