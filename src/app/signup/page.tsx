"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  User, 
  Mail, 
  Lock, 
  Briefcase, 
  ArrowRight,
  ShieldCheck,
  Factory,
  Truck,
  Users,
  ClipboardList,
  Phone,
  Activity,
  AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const ROLES = [
  { id: "admin", label: "Admin", icon: ShieldCheck, desc: "System control & governance" },
  { id: "supervisor", label: "Supervisor", icon: Users, desc: "Operational floor leadership" },
  { id: "logistics", label: "Logistics", icon: Truck, desc: "Fleet & distribution management" },
  { id: "inventory", label: "Inventory", icon: ClipboardList, desc: "Stock & supply control" },
];

export default function SignupPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [nic, setNic] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{message: string, details: string | null, hint: string | null} | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorDetails(null);

    try {
      // 1. Gather Extended Metadata
      const metadata: any = {
        full_name: fullName,
        role: selectedRole,
        nic_number: nic || null,
        phone_number: phone || null
      };

      // 2. Create Auth User with Master Metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Success: Command personnel defaults to Dashboard
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error('CRITICAL SIGNUP ERROR OBJECT:', err);
      setErrorDetails({
        message: err.message || "An unexpected error occurred during signup.",
        details: err.details || "Check browser console (F12) for raw details.",
        hint: err.hint || "No database hints provided."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#020202] relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
        {/* Left Side: Illustration / Branding */}
        <div className="hidden lg:flex flex-col gap-8">
          <Link href="/" className="flex items-center gap-2 group w-max">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-black font-black italic">FF</div>
            <span className="text-xl font-bold tracking-tighter uppercase italic text-white">FACTORYFLOW</span>
          </Link>
          
          <div className="space-y-4">
            <h1 className="text-5xl font-bold tracking-tight text-white leading-tight">
              Provision Your <br /><span className="text-neutral-500 italic">Workforce Access.</span>
            </h1>
            <p className="text-neutral-400 text-lg font-medium leading-relaxed max-w-sm">
              Create an enterprise account to access unified manufacturing and tracking intelligence.
            </p>
          </div>
        </div>

        {/* Right Side: Form */}
        <GlassCard className="!p-8 lg:!p-12 shadow-2xl">
          <form onSubmit={handleSignup} className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-white tracking-tight">Enterprise Signup</h2>
              <p className="text-sm text-neutral-500">Begin by selecting your operational job role.</p>
            </div>

            {errorDetails && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex flex-col gap-2 text-red-500 text-sm animate-fade-in">
                <div className="flex items-center gap-3">
                  <AlertCircle size={18} /> {errorDetails.message}
                </div>
              </div>
            )}

            {/* Role Selection */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.id)}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all duration-300 group",
                    selectedRole === role.id 
                      ? "bg-white/10 border-white/20 shadow-xl" 
                      : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05]"
                  )}
                >
                  <role.icon 
                    size={16} 
                    className={cn(
                      "mb-2 transition-colors",
                      selectedRole === role.id ? "text-blue-500" : "text-neutral-500"
                    )} 
                  />
                  <p className="text-[10px] font-bold text-white">{role.label}</p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-white transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="Full Name" 
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-all font-medium"
                />
              </div>

              <div className="relative group">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-white transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="NIC Number" 
                  value={nic}
                  onChange={(e) => setNic(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-all font-medium"
                />
              </div>

              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-white transition-colors" size={18} />
                <input 
                  type="tel" 
                  placeholder="Phone Number" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-all font-medium"
                />
              </div>

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

              <div className="relative group sm:col-span-2">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-white transition-colors" size={18} />
                <input 
                  type="password" 
                  placeholder="Password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-all font-medium"
                />
              </div>
            </div>

            <button 
              disabled={loading}
              className="btn-primary w-full py-4 flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading ? "Establishing Credentials..." : "Access Enterprise Terminal"} 
              {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
            </button>

            <p className="text-center text-xs text-neutral-500 font-medium">
              Already a member? <Link href="/login" className="text-white hover:underline">Sign In</Link>
            </p>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
