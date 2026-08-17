"use client";

import Link from "next/link";
import { 
  ArrowRight, 
  Globe2, 
  Cpu, 
  Truck, 
  ShieldCheck, 
  Zap,
  BarChart3,
  Factory,
  Search
} from "lucide-react";
import { motion } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";

const FEATURES = [
  { 
    icon: Factory, 
    title: "Intelligent MES", 
    desc: "Stage-by-stage precision from design to delivery, powered by real-time floor data." 
  },
  { 
    icon: Globe2, 
    title: "Global Logistics", 
    desc: "Built for international trade. Track shipments across borders with localized intelligence." 
  },
  { 
    icon: Truck, 
    title: "Live GPS Fleet", 
    desc: "Eliminate the visibility gap with sub-5 second location updates for every delivery." 
  },
  { 
    icon: ShieldCheck, 
    title: "Quality Cert", 
    desc: "Digital proof of quality at every milestone. Integrated image and signature verification." 
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-white selection:text-black overflow-x-hidden">
      {/* Aurora Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-blue-600/10 blur-[130px] rounded-full" />
        <div className="absolute top-[30%] -right-[20%] w-[60%] h-[60%] bg-indigo-600/5 blur-[130px] rounded-full" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 px-8 py-10 flex justify-between items-center max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-black font-black italic group-hover:scale-110 transition-transform">FF</div>
          <span className="text-xl font-bold tracking-tighter uppercase italic">FACTORYFLOW</span>
        </Link>
        
        <div className="hidden lg:flex items-center gap-10">
          <a href="#features" className="text-xs font-black text-blue-400/60 hover:text-blue-300 uppercase tracking-[0.3em] transition-all">Technology</a>
          <a href="#solutions" className="text-xs font-black text-blue-400/60 hover:text-blue-300 uppercase tracking-[0.3em] transition-all">Solutions</a>
          <a href="#enterprise" className="text-xs font-black text-blue-400/60 hover:text-blue-300 uppercase tracking-[0.3em] transition-all">Enterprise</a>
        </div>

        <div className="flex items-center gap-6">
          <Link href="/track" className="hidden sm:block text-base font-black text-neutral-400 hover:text-white transition-all px-6">
            Track Order
          </Link>
          <Link href="/dashboard" className="btn-primary flex items-center gap-3 group !py-3.5 !px-8 text-base font-black italic">
            Launch Platform <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10">
        <section className="px-6 pt-20 pb-40 text-center max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-12 shadow-2xl">
              <Zap size={12} fill="currentColor" />
              Next-Gen Manufacturing Logistics
            </div>
            
            <h1 className="text-5xl md:text-8xl font-bold tracking-tight mb-8 leading-[0.95]">
              Precision from <span className="bg-gradient-to-r from-white via-white to-neutral-600 bg-clip-text text-transparent">Factory</span> to <span className="text-neutral-500 italic">Frontier.</span>
            </h1>
            
            <p className="text-neutral-500 text-lg md:text-xl max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
              FactoryFlow unifies manufacturing execution and international tracking into a single, high-fidelity ecosystem. Engineered for global excellence.
            </p>

            <div className="flex justify-center mt-16">
              <Link href="/track" className="relative group">
                <div className="absolute -inset-1 bg-blue-500 rounded-2xl blur opacity-0 group-hover:opacity-20 transition-all duration-500" />
                <div className="btn-secondary !px-16 !py-8 text-lg font-black uppercase tracking-[0.2em] flex items-center gap-4 border border-white/20 hover:border-blue-500 transition-all bg-white/5 backdrop-blur-sm">
                  Track Live Mission <Search size={24} />
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                </div>
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Dashboard Preview Overlay */}
        <section id="solutions" className="px-6 max-w-7xl mx-auto relative -mt-20 mb-40">
          <div className="relative group">
            {/* Main Image Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-[2.5rem] blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200" />
            
            <div className="relative rounded-[2.5rem] bg-neutral-900 border border-white/10 overflow-hidden shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=2000" 
                alt="FactoryFlow Dashboard Preview" 
                className="w-full h-auto opacity-50 grayscale hover:grayscale-0 transition-all duration-1000 scale-105 group-hover:scale-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/20 to-transparent" />
              
              <div className="absolute bottom-12 left-12 right-12 flex flex-col md:flex-row items-end justify-between gap-8">
                <div className="max-w-md">
                  <h3 className="text-3xl font-bold mb-4">Integrated Intelligence.</h3>
                  <p className="text-neutral-400 font-medium">Real-time production metrics, vehicle telemetry, and quality checkpoints unified in a dark luxury interface.</p>
                </div>
                <div className="flex gap-4">
                  {[
                    { icon: BarChart3, label: "84% OEE" },
                    { icon: Cpu, label: "5s Latency" },
                  ].map((stat, i) => (
                    <div key={i} className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-3">
                      <stat.icon size={20} className="text-blue-500" />
                      <span className="text-sm font-bold tracking-tight">{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="px-6 py-40 max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold mb-6">Engineered for Transparency.</h2>
            <p className="text-neutral-500 max-w-2xl mx-auto italic font-medium text-lg">Every stage documented. Every mile tracked. Zero visibility gap.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {FEATURES.map((feature, i) => (
              <GlassCard key={i} className="!p-10 group hover:-translate-y-2 transition-all duration-500">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                  <feature.icon size={28} />
                </div>
                <h4 className="text-xl font-bold mb-4">{feature.title}</h4>
                <p className="text-neutral-500 text-sm leading-relaxed font-medium">
                  {feature.desc}
                </p>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* Global Reach Callout */}
        <section id="enterprise" className="px-6 py-40 bg-white/5">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20">
            <div className="flex-1 space-y-8 text-center lg:text-left">
              <h2 className="text-5xl font-bold tracking-tight leading-tight">Sri Lanka Based.<br /><span className="text-neutral-500">Global Impact.</span></h2>
              <p className="text-neutral-400 text-lg leading-relaxed font-medium">
                Strategically located at the heart of South Asia, FactoryFlow connects local precision manufacturing with international shipping ports and global data centers.
              </p>
              <div className="flex justify-center lg:justify-start gap-8">
                <div className="space-y-1">
                  <p className="text-3xl font-bold">12+</p>
                  <p className="text-xs text-neutral-500 font-black uppercase tracking-widest">Countries</p>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-bold">24/7</p>
                  <p className="text-xs text-neutral-500 font-black uppercase tracking-widest">Global Support</p>
                </div>
              </div>
            </div>
            <div className="flex-1 w-full lg:w-auto relative group">
               <div className="absolute -inset-1 bg-white/10 rounded-3xl blur opacity-30" />
               <img 
                 src="/images/port.png" 
                 alt="Sri Lanka Port" 
                 className="w-full h-80 object-cover rounded-3xl border border-white/10 opacity-70 group-hover:opacity-100 transition duration-1000"
               />
            </div>
          </div>
        </section>
      </main>

      <footer className="px-8 py-20 border-t border-white/5 text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black font-black italic text-xs">FF</div>
          <span className="text-sm font-bold tracking-tighter uppercase italic">FACTORYFLOW</span>
        </div>
        <p className="text-neutral-600 text-[10px] font-black uppercase tracking-[0.5em] mb-4">The Future of Fabricated Flow</p>
        <p className="text-neutral-700 text-[10px] font-medium uppercase tracking-[0.2em]">© 2026 FactoryFlow Sri Lanka — Global Precision. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
