"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { 
  Search, 
  Package, 
  MapPin, 
  CheckCircle2, 
  ArrowRight,
  Loader2,
  X,
  Truck,
  ShieldCheck,
  Navigation
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const OSMPublicMap = dynamic(() => import("@/components/ui/OSMPublicMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-neutral-900 animate-pulse flex flex-col items-center justify-center gap-4">
      <Navigation className="text-neutral-800 animate-spin" size={48} />
      <p className="text-[10px] text-neutral-700 font-black uppercase tracking-[0.5em]">Establishing Satellite Link</p>
    </div>
  )
});

const defaultCenter = {
  lat: 7.8731,
  lng: 80.7718
};

export default function PublicTrackingPage() {
  const [orderId, setOrderId] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [vehicleData, setVehicleData] = useState<any>(null);

  const fetchTrackData = async (id: string) => {
    setIsSearching(true);
    try {
      const searchTarget = id.trim().toUpperCase();
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .select(`
          *,
          assigned_driver_id
        `)
        .eq('id', searchTarget)
        .maybeSingle();

      if (orderErr) throw orderErr;
      
      if (order) {
        setOrderData(order);

        if (order.assigned_driver_id || order.status === 'in_transit' || order.status === 'in_production') {
          const { data: vehicle } = await supabase
            .from('vehicles')
            .select('*')
            .or(`driver_id.eq.${order.assigned_driver_id},current_order_id.eq.${order.id}`)
            .maybeSingle();
          
          setVehicleData(vehicle);
        }
      } else {
        setOrderData(null);
        setVehicleData(null);
      }
    } catch (err) {
      console.error('Tracking fetch failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (!orderData) return;

    const channel = supabase
      .channel(`public-tracking-${orderData.id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'orders',
        filter: `id=eq.${orderData.id}`
      }, (payload) => {
        setOrderData(payload.new);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'vehicles'
      }, (payload: any) => {
        if (payload.new && (payload.new.driver_id === orderData.assigned_driver_id || payload.new.current_order_id === orderData.id)) {
          setVehicleData(payload.new);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderData?.id, orderData?.assigned_driver_id]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) return;
    fetchTrackData(orderId);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-blue-500 selection:text-white font-sans overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_20%,#1e3a8a20,transparent_70%)]" />
      </div>

      <header className="relative z-50 px-6 py-6 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
              <Navigation className="text-white" size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tighter italic uppercase">Factory<span className="text-blue-500">Flow</span></h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/10">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Strategic Tracking</span>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 p-6 md:p-12 max-w-6xl mx-auto min-h-[calc(100vh-160px)] flex flex-col justify-center">
        {!orderData && !isSearching ? (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-12 py-20"
          >
            <div className="space-y-4">
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-white uppercase italic leading-none">
                Track Your <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500">Vision.</span>
              </h2>
              <p className="text-neutral-500 text-sm md:text-base max-w-lg mx-auto font-medium tracking-wide mt-6">
                Enter your unique Order ID to establish a real-time connection from the factory floor to your destination.
              </p>
            </div>

            <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative group mt-12">
              <input 
                type="text" 
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. ORD-INT-2026-001" 
                className="w-full bg-white/[0.03] border border-white/10 rounded-3xl px-10 py-8 text-2xl font-black text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-neutral-800 uppercase italic tracking-tighter"
              />
              <button 
                type="submit"
                disabled={!orderId}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 disabled:opacity-20 text-white rounded-2xl p-5 transition-all shadow-xl shadow-blue-600/20"
              >
                <ArrowRight size={24} />
              </button>
            </form>
          </motion.section>
        ) : isSearching ? (
          <div className="flex flex-col items-center justify-center py-40 gap-6">
            <Loader2 className="animate-spin text-blue-500" size={64} />
            <p className="text-[12px] text-neutral-500 font-black uppercase tracking-[0.5em] animate-pulse">Establishing Satellite Lock</p>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch"
          >
            <div className="lg:col-span-4 space-y-6 flex flex-col">
              <GlassCard className="!p-8 rounded-[40px] border-white/10 bg-black/60 backdrop-blur-3xl shadow-2xl flex-1">
                <div className="flex justify-between items-start mb-12">
                  <div className="space-y-1">
                    <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">Tracking Objective</p>
                    <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase">{orderData.id}</h3>
                  </div>
                  <button onClick={() => setOrderData(null)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-neutral-500"><X size={20}/></button>
                </div>

                <div className="space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-500">
                      <Truck size={20} />
                    </div>
                    <div>
                      <p className="text-[9px] text-neutral-500 font-black uppercase tracking-widest">Global Status</p>
                      <p className="text-base font-black text-white uppercase italic">{orderData.status.replace('_', ' ')}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-500">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <p className="text-[9px] text-neutral-500 font-black uppercase tracking-widest">Destination</p>
                      <p className="text-base font-black text-white uppercase italic truncate max-w-[180px]">{orderData.destination_country || "Sri Lanka"}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-12 pt-12 border-t border-white/5">
                  <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-8">Mission Progression</h4>
                  
                  <div className="space-y-0 relative">
                    <div className="absolute left-5 top-2 bottom-2 w-px bg-white/5" />
                    
                    {[
                      { 
                        label: "Order Confirmed", 
                        id: 'confirmed',
                        done: true, 
                        active: false 
                      },
                      { 
                        label: "Manufacturing Hub", 
                        id: 'production',
                        done: ['in_production', 'in_transit', 'completed', 'delivered'].includes(orderData.status), 
                        active: orderData.status === 'in_production' 
                      },
                      { 
                        label: "Tactical Transit", 
                        id: 'transit',
                        done: ['in_transit', 'completed', 'delivered'].includes(orderData.status), 
                        active: orderData.status === 'in_transit' 
                      },
                      { 
                        label: "Verified Delivery", 
                        id: 'delivered',
                        done: orderData.status === 'delivered', 
                        active: orderData.status === 'delivered' 
                      },
                    ].map((step, i, arr) => (
                      <div key={i} className="relative pb-10 last:pb-0 flex gap-6 items-start group">
                        <div className={cn(
                          "w-10 h-10 rounded-2xl border flex items-center justify-center transition-all duration-700 relative z-10",
                          step.done && !step.active ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]" : 
                          step.active ? "bg-black border-blue-500 text-blue-500 animate-pulse shadow-[0_0_15px_rgba(37,99,235,0.2)]" : 
                          "bg-black border-white/5 text-neutral-800"
                        )}>
                          {step.done && !step.active ? <CheckCircle2 size={16}/> : <span className="text-[10px] font-black">{i+1}</span>}
                          
                          {step.active && (
                            <div className="absolute inset-0 rounded-2xl border-2 border-blue-500 animate-ping opacity-20" />
                          )}
                        </div>

                        {i < arr.length - 1 && (
                          <div className={cn(
                            "absolute left-5 top-10 w-px h-10 transition-colors duration-1000",
                            step.done ? "bg-blue-600" : "bg-white/5"
                          )} />
                        )}

                        <div className="flex flex-col justify-center pt-2">
                          <p className={cn(
                            "text-[10px] font-black uppercase tracking-widest transition-colors duration-500",
                            step.active ? "text-blue-500 italic" : step.done ? "text-white" : "text-neutral-700"
                          )}>
                            {step.label}
                          </p>
                          <p className="text-[8px] text-neutral-600 font-bold uppercase tracking-[0.2em] mt-1">
                            {step.active ? "CURRENT PHASE" : step.done ? "PHASE COMPLETED" : "OPERATIONAL STANDBY"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCard>

              {orderData.status === 'delivered' && orderData.pod_image_url && (
                <GlassCard className="!p-6 rounded-[32px] border-white/10 bg-black/60 backdrop-blur-3xl h-fit">
                   <h5 className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                     <ShieldCheck size={14}/> Proof of Mission
                   </h5>
                   <div className="rounded-2xl overflow-hidden border border-white/10 aspect-video relative group shadow-2xl">
                      <img src={orderData.pod_image_url} alt="POD" className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-80 z-10" />
                      <div className="absolute inset-x-4 bottom-4 flex justify-between items-center z-20 pointer-events-auto">
                        <span className="text-[8px] text-white/50 font-black uppercase tracking-widest italic">Mission POD Verified</span>
                        <a 
                          href={orderData.pod_image_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[9px] font-black text-white uppercase tracking-widest bg-blue-600 px-5 py-2.5 rounded-xl shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:bg-blue-500 transition-all active:scale-90 border border-white/20 cursor-pointer block"
                        >
                          Full Intel View
                        </a>
                      </div>
                   </div>
                </GlassCard>
              )}
            </div>

            <div className="lg:col-span-8 h-[500px] lg:h-auto">
              <div className="w-full h-full rounded-[48px] overflow-hidden border border-white/10 bg-black relative shadow-2xl">
                {(orderData.status === 'in_transit' || orderData.status === 'in_production') && vehicleData ? (
                  <>
                    <OSMPublicMap
                      center={{
                        lat: vehicleData.last_latitude || vehicleData.current_lat || defaultCenter.lat,
                        lng: vehicleData.last_longitude || vehicleData.current_lng || defaultCenter.lng
                      }}
                      zoom={15}
                      vehicleId={vehicleData.id}
                    />
                    <div className="absolute top-8 left-8 p-6 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl z-10">
                      <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mb-1 animate-pulse">Satellite Lock</p>
                      <h6 className="text-xl font-black text-white tracking-tighter uppercase italic">{vehicleData.id}</h6>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center">
                    <div className="w-32 h-32 bg-blue-500/5 border border-blue-500/10 rounded-full flex items-center justify-center mb-8">
                       <Package size={48} className="text-blue-500/50" />
                    </div>
                    <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">
                      {orderData.status === 'delivered' ? "Destination Reached" : "Manufacturing Hub"}
                    </h3>
                    <p className="text-neutral-500 text-sm max-w-sm mx-auto font-medium">
                      {orderData.status === 'delivered' 
                        ? "This mission has been clinically completed. Proof of delivery is available in your intel feed." 
                        : "Your mission is currently on the factory floor. Live GPS synchronization will prime once the mission is dispatched."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </main>

      <footer className="relative z-50 py-10 border-t border-white/5 text-center">
        <p className="text-neutral-600 text-[10px] font-black uppercase tracking-[0.4em]">© 2026 FACTORYFLOW SRI LANKA — GLOBAL PRECISION</p>
      </footer>
    </div>
  );
}
