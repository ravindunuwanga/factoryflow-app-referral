"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  CheckCircle2, 
  Clock, 
  QrCode, 
  Camera, 
  ChevronRight, 
  MoreHorizontal,
  ChevronDown,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const STAGES = [
  "Design", 
  "Production 01", 
  "Print", 
  "Pasting", 
  "Production 02", 
  "Packing", 
  "Delivery"
];

export default function ManufacturingPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [auditResult, setAuditResult] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string>("admin");
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    fetchOrders();
    fetchUserContext();
    
    // TACTICAL PULSE: High-resiliency manufacturing synchronization
    const channel = supabase
      .channel('manufacturing-pulse')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'orders' 
      }, (payload) => {
        console.log('[PULSE] Manufacturing event detected:', payload.eventType);
        fetchOrders();
      })
      .subscribe((status) => {
        console.log('[PULSE] Manufacturing subscription status:', status);
      });

    return () => { 
      console.log('[PULSE] Deactivating Manufacturing subscription...');
      supabase.removeChannel(channel); 
    };
  }, []);

  const fetchUserContext = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setUserProfile(profile);
      setUserRole((profile?.role || "admin").toLowerCase());
    }
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setOrders(data || []);
      if (data && data.length > 0 && !selectedOrderId) {
        setSelectedOrderId(data[0].id);
      }
    } catch (err) {
      console.error('Fetch failure:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedOrder = orders.find(o => o.id === selectedOrderId);
  const isMissionComplete = selectedOrder?.status === 'delivered' || selectedOrder?.status === 'completed';
  const currentStage = isMissionComplete ? STAGES.length : (selectedOrder?.production_stage || 1);

  const handleUpdateStage = async () => {
    if (!selectedOrder) return;
    if (currentStage < STAGES.length) {
      setIsUpdating(true);
      const nextStage = currentStage + 1;
      
      const { error } = await supabase
        .from('orders')
        .update({ 
          production_stage: nextStage,
          status: nextStage === STAGES.length ? 'completed' : 'in_production'
        })
        .eq('id', selectedOrder.id);
      
      if (error) {
        alert("STAGE UPDATE FAILURE: Communications breakdown.");
      }
      setIsUpdating(false);
    }
  };

  const handleAudit = async (passed: boolean) => {
    if (!selectedOrder) return;
    setAuditResult(passed);
    const { error } = await supabase
      .from('orders')
      .update({ quality_passed: passed })
      .eq('id', selectedOrder.id);
    
    if (!error) {
      setTimeout(() => setShowAudit(false), 1000);
    }
  };

  const selectOrder = (id: string) => {
    setSelectedOrderId(id);
  };

  return (
    <div className="space-y-8 pb-10">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2 uppercase tracking-widest">Manufacturing Execution</h2>
          <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest">Track and manage production stages in real-time.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowScanner(true)}
            className="btn-secondary flex items-center gap-2 !px-6 border-white/10 hover:bg-white/10 transition-colors"
          >
            <QrCode size={18} /> Scan Token
          </button>
          <Link href="/orders" className="btn-primary !px-6 flex items-center gap-2 shadow-lg">
            + New Work Order
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Active Work Orders List */}
        <GlassCard className="xl:col-span-1 flex flex-col h-[700px] border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]">Active Orders</h4>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
              {orders.length} Active
            </div>
          </div>
          
          <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-neutral-700">
                <Loader2 className="animate-spin mb-4" size={24} />
                <p className="text-[10px] uppercase font-black tracking-widest">Syncing Line...</p>
              </div>
            ) : orders.map((order) => (
              <div 
                key={order.id} 
                onClick={() => selectOrder(order.id)}
                className={cn(
                  "p-4 rounded-xl border transition-all cursor-pointer group",
                  selectedOrderId === order.id 
                    ? "bg-white/10 border-white/20 shadow-xl scale-[1.02]" 
                    : "bg-white/[0.01] border-white/5 hover:bg-white/[0.03]"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-bold text-white tracking-widest uppercase">{order.id}</span>
                   <div className={cn(
                    "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border shadow-sm",
                    order.status === 'in_production' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : 
                    order.status === 'delivered' ? "bg-green-500 text-white border-green-400 shadow-[0_0_10px_rgba(34,197,94,0.3)]" :
                    order.status === 'completed' ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/30" :
                    "bg-neutral-900 text-neutral-500 border-white/10"
                  )}>
                    {order.status === 'delivered' ? "DELIVERED" : order.status.replace('_', ' ')}
                  </div>
                </div>
                <p className="text-xs text-neutral-400 font-medium mb-4 italic">{order.client_name}</p>
                 <div className="flex flex-col gap-1.5 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-mono">
                      <Clock size={12} className="text-neutral-600" />
                      <span className="text-[10px] text-neutral-600 font-bold">
                         ST {order.production_stage}/{STAGES.length}
                      </span>
                    </div>
                    {order.delivered_at && (
                      <p className="text-[9px] text-green-500/80 font-black uppercase tracking-widest italic">
                        {new Date(order.delivered_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} @ {new Date(order.delivered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                    <ChevronRight size={14} className={cn("text-neutral-700 transition-transform", selectedOrderId === order.id && "rotate-90 text-white")} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Work Order Detail & Tracking */}
        <GlassCard className="xl:col-span-2 flex flex-col min-h-[700px] border-white/5">
          {selectedOrderId ? (
            <div className="space-y-8 animate-fade-in">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-bold text-white tracking-tighter">{selectedOrderId}</h3>
                    <div className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest transition-all",
                      isMissionComplete ? "bg-green-600 text-white border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]" : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                    )}>
                      {isMissionComplete ? "Mission Complete" : "Live Production"}
                    </div>
                  </div>
                  <p className="text-neutral-500 text-sm font-medium italic">Project Authority: <span className="text-white font-bold">{selectedOrder?.client_name || "Enterprise"}</span></p>
                </div>
                <div className="p-3 border border-white/10 rounded-xl bg-white/[0.02] shadow-inner">
                  <QRCodeSVG value={selectedOrderId || "N/A"} size={70} bgColor="transparent" fgColor="#ffffff" level="L" />
                </div>
              </div>

              {/* Progress Timeline */}
              <div className="relative pt-12 pb-8">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-white/5 lg:left-0 lg:right-0 lg:top-1/2 lg:bottom-auto lg:h-px lg:-translate-y-1/2 lg:bg-white/10" />
                
                <div className="grid grid-cols-1 gap-12 lg:grid-cols-7 lg:gap-4 relative px-2">
                  {STAGES.map((stage, i) => {
                    const isCompleted = i < currentStage;
                    const isCurrent = i === currentStage;
                    
                    return (
                      <div key={stage} className="flex flex-col items-center group lg:text-center relative">
                        <div className={cn(
                          "w-12 h-12 rounded-full border-2 flex items-center justify-center z-10 transition-all duration-700 shadow-lg",
                          isCompleted ? "bg-white text-black border-white" : 
                          isCurrent ? "bg-blue-600 text-white border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)] scale-110" : 
                          "bg-neutral-900 text-neutral-700 border-neutral-800"
                        )}>
                          {isCompleted ? <CheckCircle2 size={24} /> : <span className="text-sm font-black">{i + 1}</span>}
                        </div>
                        <div className="mt-4 space-y-1 lg:mt-6">
                          <p className={cn(
                            "text-[10px] font-black uppercase tracking-[0.15em] transition-colors",
                            isCompleted || isCurrent || isMissionComplete ? "text-white" : "text-neutral-700"
                          )}>
                            {stage}
                          </p>
                          {(isCompleted || isMissionComplete) && (
                            <p className="text-[10px] text-neutral-600 font-mono">FINISH</p>
                          )}
                          {isCurrent && !isMissionComplete && (
                            <button 
                              onClick={handleUpdateStage}
                              disabled={isUpdating}
                              className="text-[9px] text-blue-400 font-black uppercase tracking-widest hover:text-blue-300 transition-colors py-1 px-2 bg-blue-500/5 rounded border border-blue-500/10 mt-1 flex items-center gap-1"
                            >
                              {isUpdating ? <Loader2 className="animate-spin" size={10} /> : "Finalize Stage"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <button 
                  onClick={() => userRole !== 'admin' && setShowAudit(true)}
                  disabled={userRole === 'admin'}
                  className={cn(
                    "flex items-center justify-between p-6 rounded-2xl bg-white/[0.01] border border-white/5 transition-all group",
                    userRole !== 'admin' && "hover:border-white/10 hover:bg-white/[0.03]"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center transition-all shadow-lg border border-white/5",
                      selectedOrder?.quality_passed === false ? "bg-red-600/10 text-red-500" : 
                      selectedOrder?.quality_passed === true ? "bg-green-600/10 text-green-500" : "text-neutral-500 group-hover:text-white"
                    )}>
                      <Camera size={24} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-white uppercase tracking-tight">Quality Audit</p>
                      <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                        {userRole === 'admin' ? (
                          selectedOrder?.quality_passed === true ? "STATUS: QUALITY VERIFIED" :
                          selectedOrder?.quality_passed === false ? "STATUS: DEFECT DETECTED" : "AWAITING FLOOR INSPECTION"
                        ) : (
                          selectedOrder?.quality_passed === false ? "ALERT: DEFECT DETECTED" : 
                          selectedOrder?.quality_passed === true ? "STATUS: QUALITY VERIFIED" : `Verify production Stage ${currentStage}`
                        )}
                      </p>
                    </div>
                  </div>
                  {userRole !== 'admin' && <ChevronRight size={18} className="text-neutral-700 group-hover:text-white transition-all" />}
                </button>
                <div className="flex items-center justify-between p-6 rounded-2xl bg-white/[0.01] border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-neutral-500 shadow-lg border border-white/5">
                      <QrCode size={24} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-white uppercase tracking-tight">System Identity</p>
                      <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Unique Mission Hash Secured</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Functional Modals */}
              {showScanner && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setShowScanner(false)} />
                  <GlassCard className="relative w-full max-w-sm !p-10 text-center space-y-6">
                    <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center mx-auto border border-blue-500/20 text-blue-500">
                      <QrCode size={40} className="animate-pulse" />
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-xl font-black text-white uppercase italic">Initializing Scanner</h3>
                       <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest leading-relaxed">
                         Align mission token with camera aperture for authentication.
                       </p>
                    </div>
                    <div className="w-full aspect-square border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center bg-black/40">
                       <p className="text-[8px] text-neutral-700 font-black uppercase tracking-[0.3em]">Awaiting Hardware Handshake...</p>
                    </div>
                    <button onClick={() => setShowScanner(false)} className="w-full py-4 bg-white/5 rounded-xl text-[10px] font-black text-neutral-400 uppercase tracking-widest border border-white/5">Abort Scan</button>
                  </GlassCard>
                </div>
              )}

              {showAudit && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setShowAudit(false)} />
                  <GlassCard className="relative w-full max-w-sm !p-10 text-center space-y-6">
                    <div className="w-20 h-20 bg-green-600/10 rounded-3xl flex items-center justify-center mx-auto border border-green-500/20 text-green-500">
                      <ShieldCheck size={40} />
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-xl font-black text-white uppercase italic">Quality Assurance</h3>
                       <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">Perform clinical verification for {selectedOrderId}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <button 
                         onClick={() => handleAudit(true)}
                         className="py-6 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-500 hover:bg-green-500/20 transition-all flex flex-col items-center gap-2"
                       >
                         <CheckCircle2 size={24} />
                         <span className="text-[9px] font-black uppercase tracking-[0.2em]">PASS</span>
                       </button>
                       <button 
                         onClick={() => handleAudit(false)}
                         className="py-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 hover:bg-red-500/20 transition-all flex flex-col items-center gap-2"
                       >
                         <AlertCircle size={24} />
                         <span className="text-[9px] font-black uppercase tracking-[0.2em]">FAIL</span>
                       </button>
                    </div>
                  </GlassCard>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-neutral-700 space-y-4">
              <QrCode size={48} className="opacity-10 animate-pulse" />
              <p className="text-xs font-black uppercase tracking-[0.3em]">Ready for Selection</p>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

const ClipboardList = ({ size, className }: { size: number, className: string }) => (
  <QrCode size={size} className={className} />
);
