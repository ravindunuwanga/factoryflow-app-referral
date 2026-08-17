"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Mail, 
  Lock, 
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { supabase } from "@/lib/supabase";

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
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data.user) {
        // Fetch role from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();
        
        const role = profile?.role || 'admin';

        // Redirect based on role
        if (role === 'driver') {
          router.push('/driver');
        } else if (role === 'operator') {
          router.push('/manufacturing');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err: any) {
      // Catch sensitive database error and show a user-friendly message
      if (err.message?.includes('row-level security policy') || err.message?.includes('violates')) {
        setError("Security clearance verification failed. Please contact terminal administration.");
      } else {
        setError(err.message || "Invalid credentials or unauthorized access attempt.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async () => {
    if (!email) {
      setError("Please enter your work email to request a clearance reset.");
      return;
    }

    setLoading(true);
    try {
      // 1. Identify User (Simulated for this master terminal, in real it would be auth.users)
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();
      
      const userId = profile?.id || crypto.randomUUID();

      // 2. Log Reset Request
      const { error: resetError } = await supabase
        .from('password_reset_requests')
        .insert({
          user_id: userId,
          full_name: profile?.full_name || "Unknown Staff",
          email: email,
          status: 'pending'
        });

      if (resetError) throw resetError;

      alert("Reset Request Logged. An Administrator will override your credentials shortly. Check the Governance Hub.");
      setError(null);
    } catch (err: any) {
      setError("Reset Request Failure: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#020202] relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/5 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-8">
        <div className="text-center space-y-4">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-black font-black italic">FF</div>
            <span className="text-xl font-bold tracking-tighter uppercase italic text-white">FACTORYFLOW</span>
          </Link>
          <h1 className="text-3xl font-bold text-white tracking-tight">Security Gateway</h1>
          <p className="text-sm text-neutral-500">Sign in to your enterprise terminal.</p>
        </div>

        <GlassCard className="!p-8 shadow-2xl space-y-8">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-sm animate-fade-in">
              <AlertCircle size={18} /> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-white transition-colors" size={18} />
                <input 
                  type="email" 
                  placeholder="Work Email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-all font-medium"
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-white transition-colors" size={18} />
                <input 
                  type="password" 
                  placeholder="Security Password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-all font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-white/10 bg-white/5 accent-white" />
                <span className="text-xs text-neutral-500 group-hover:text-neutral-300 transition-colors">Keep session alive</span>
              </label>
              <button 
                type="button" 
                onClick={handleResetRequest}
                className="text-xs text-blue-500 hover:underline disabled:opacity-50"
                disabled={loading}
              >
                Reset Clearance
              </button>
            </div>

            <button 
              disabled={loading}
              className="btn-primary w-full py-4 flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Authenticate"} 
              {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="pt-6 border-t border-white/5 text-center">
            <p className="text-xs text-neutral-500">
              New to Flow? <Link href="/signup" className="text-white hover:underline">Deploy Credentials</Link>
            </p>
          </div>
        </GlassCard>

        <div className="flex items-center justify-center gap-6 text-neutral-700">
           <div className="flex items-center gap-1">
             <ShieldCheck size={14} />
             <span className="text-[10px] uppercase font-bold tracking-widest">Encrypted Auth</span>
           </div>
           <div className="w-1 h-1 bg-neutral-800 rounded-full" />
           <p className="text-[10px] uppercase font-bold tracking-widest">ISO-27001 Certified</p>
        </div>
      </div>
    </div>
  );
}
