"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  User, 
  Mail, 
  Lock, 
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Truck,
  Phone,
  FileText
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import TacticalSelect from "@/components/ui/TacticalSelect";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [nic, setNic] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("truck");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      // MASTER ENFORCEMENT: Only 'driver' role allowed for mobile signup
      const metadata = {
        full_name: fullName,
        role: 'driver',
        nic_number: nic,
        phone_number: phone,
        vehicle_type: vehicleType,
        vehicle_number: vehicleNumber
      };

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: metadata
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        alert("Credential Provisioning Sent. Verify your email to activate the HUB.");
        router.push('/login');
      }
    } catch (err: any) {
      setError(err.message || "Credential provisioning failure.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#020202] relative overflow-hidden font-sans">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-white shadow-xl relative overflow-hidden">
                <ShieldCheck size={24} className="relative z-10 text-blue-500" />
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
             </div>
             <div className="text-left">
                <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white leading-none">Identity Sync</h1>
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-[0.2em] mt-1">Onboarding Terminal • v2.1</p>
             </div>
          </div>
        </div>

        <GlassCard className="!p-8 shadow-2xl space-y-6">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-[10px] font-black uppercase tracking-widest"
            >
              <AlertCircle size={16} /> {error}
            </motion.div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                <input 
                  type="text" placeholder="Full Name" required
                  value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/20 font-medium"
                />
              </div>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                <input 
                  type="email" placeholder="Work Email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/20 font-medium"
                />
              </div>

              <div className="relative">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                <input 
                  type="text" placeholder="NIC Number" required
                  value={nic} onChange={(e) => setNic(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/20 font-medium"
                />
              </div>

              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                <input 
                  type="text" placeholder="Phone Number" required
                  value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/20 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <TacticalSelect 
                    options={[
                      { value: 'truck', label: 'Truck Unit' },
                      { value: 'van', label: 'Van Unit' },
                      { value: 'lorry', label: 'Lorry Unit' }
                    ]}
                    value={vehicleType}
                    onChange={setVehicleType}
                    className="!z-50"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none z-40">
                    <Truck size={16} />
                  </div>
                </div>
                <input 
                  type="text" placeholder="Plate #" required
                  value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/20 font-medium"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                <input 
                  type="password" placeholder="Security Key" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/20 font-medium tracking-widest"
                />
              </div>
            </div>

            <button 
              disabled={loading}
              className="w-full py-5 mt-4 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-[0.3em] text-xs flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_0_40px_rgba(37,99,235,0.2)]"
            >
              {loading ? "PROVISIONING..." : "DEPLOY CREDENTIALS"} 
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="pt-4 border-t border-white/5 text-center">
            <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest leading-relaxed">
              Already Active? <Link href="/login" className="text-white hover:underline">Sign In Hub</Link>
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
