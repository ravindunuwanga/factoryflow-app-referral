"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Mail, 
  Lock, 
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Truck
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (authError) throw authError;

      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();
        
        if (profileError || !['driver', 'admin', 'supervisor'].includes(profile?.role)) {
          await supabase.auth.signOut();
          throw new Error("Security Clearance Refused: This terminal is for Operational Drivers and Authorized Managers only.");
        }
        
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || "Invalid credentials or unauthorized access attempt.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#020202] relative overflow-hidden font-sans">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-600/5 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-white shadow-xl relative overflow-hidden mt-1">
                <Truck size={24} className="relative z-10" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
             </div>
             <div className="text-left">
                <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white leading-none">Driver HUB</h1>
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-[0.2em] mt-1">Security Gateway • v2.1</p>
             </div>
          </div>
        </div>

        <GlassCard className="!p-8 shadow-2xl space-y-8">
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-xs font-bold"
            >
              <AlertCircle size={16} /> {error}
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-white transition-colors" size={18} />
                <input 
                  type="email" 
                  placeholder="Id Email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-all font-medium tracking-tight"
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-white transition-colors" size={18} />
                <input 
                  type="password" 
                  placeholder="Security Key" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-all font-medium tracking-[0.2em]"
                />
              </div>
            </div>

            <button 
              disabled={loading}
              className="w-full py-5 rounded-2xl bg-white text-black font-black uppercase tracking-[0.3em] text-xs flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Authenticate"} 
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="pt-6 border-t border-white/5 text-center">
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest leading-relaxed">
              New Driver? <Link href="/signup" className="text-white hover:underline">Provision Identity</Link>
            </p>
          </div>
        </GlassCard>

        <div className="flex items-center justify-center gap-6 text-neutral-700">
           <div className="flex items-center gap-1.5 grayscale opacity-50">
             <ShieldCheck size={14} />
             <span className="text-[9px] uppercase font-black tracking-[0.2em]">Tactical Encryption</span>
           </div>
        </div>
      </div>
    </div>
  );
}
