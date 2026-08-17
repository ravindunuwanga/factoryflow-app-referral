"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { 
  Truck, 
  Navigation, 
  MapPin, 
  Phone, 
  MessageSquare,
  Search,
  Filter,
  Loader2,
  ShieldCheck,
  Clock,
  X,
  ArrowRight,
  Bell,
  Camera
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const OSMTrackingMap = dynamic(() => import("@/components/ui/OSMTrackingMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-neutral-900 animate-pulse flex flex-col items-center justify-center gap-4">
      <Navigation className="text-neutral-800 animate-spin" size={48} />
      <p className="text-[10px] text-neutral-700 font-black uppercase tracking-[0.5em]">Establishing Satellite Link</p>
    </div>
  )
});

const defaultCenter = {
  lat: 6.9271,
  lng: 79.8612
};

export default function TrackingPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [currentZoom, setCurrentZoom] = useState(13);

  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);

  useEffect(() => {
    fetchVehicles();
    fetchPendingOrders();

    const channel = supabase
      .channel('tracking-pulse')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'vehicles' 
      }, (p) => {
        fetchVehicles();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'orders' 
      }, (p) => {
        fetchPendingOrders();
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
    };
  }, []);

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *, 
          profiles(full_name, nic_number, phone_number), 
          orders(*)
        `);
      
      if (error) throw error;
      setVehicles(data || []);
    } catch (err) {
      console.error('Fleet fetch failure:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'pending');
    setPendingOrders(data || []);
  };

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  const vectorToVehicle = useCallback((vehicle: any) => {
    if (!vehicle) return;
    const lat = vehicle.last_latitude || vehicle.current_lat || 6.9271;
    const lng = vehicle.last_longitude || vehicle.current_lng || 79.8612;
    
    setMapCenter({ lat, lng });
    setCurrentZoom(16);
  }, []);

  const [recentOrder, setRecentOrder] = useState<any>(null);

  const fetchRecentMission = async (driverId: string) => {
    try {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('assigned_driver_id', driverId)
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false })
        .limit(1);
      
      setRecentOrder(data ? data[0] : null);
    } catch (err) {
      console.error('Mission intel failure:', err);
    }
  };

  useEffect(() => {
    if (selectedVehicle) {
      vectorToVehicle(selectedVehicle);
      if (selectedVehicle.driver_id) {
        fetchRecentMission(selectedVehicle.driver_id);
      }
    } else {
      setRecentOrder(null);
    }
  }, [selectedVehicleId, vectorToVehicle]);

  const handleQuickDispatch = async (orderId: string) => {
    if (!selectedVehicle || !selectedVehicle.driver_id) return;
    
    setIsDispatching(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          assigned_driver_id: selectedVehicle.driver_id,
          status: 'in_production',
          scheduled_start_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      await supabase
        .from('vehicles')
        .update({
          is_mission_active: true,
          current_order_id: orderId,
          status: 'in_transit'
        })
        .eq('driver_id', selectedVehicle.driver_id);

      await supabase.from('notifications').insert({
        user_id: selectedVehicle.driver_id,
        title: "Immediate Strategic Mission",
        message: `Mission ${orderId} activated and assigned to your unit. Status: IN TRANSIT.`,
        type: 'warning'
      });

      setShowDispatchModal(false);
      fetchVehicles();
      fetchPendingOrders();
    } catch (err: any) {
      alert("Dispatch Jam: " + err.message);
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="h-[calc(100vh-144px)] flex flex-col gap-6 relative -mt-4">
      <div className="absolute inset-0 rounded-3xl overflow-hidden border border-white/10 shadow-[0_32px_64px_rgba(0,0,0,0.5)] z-0 h-full">
        <OSMTrackingMap
          vehicles={vehicles}
          selectedVehicleId={selectedVehicleId}
          mapCenter={mapCenter}
          currentZoom={currentZoom}
          onSelectVehicle={(vehicle) => {
            setSelectedVehicleId(vehicle.id);
            vectorToVehicle(vehicle);
          }}
        />
      </div>

      <section className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-4 shrink-0 p-6 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="pointer-events-auto">
          <h2 className="text-2xl font-black tracking-tight text-white mb-1 uppercase tracking-[0.2em] shadow-black drop-shadow-lg italic">Fleet Intelligence</h2>
          <p className="text-neutral-400 text-[9px] font-black uppercase tracking-[0.3em]">Strategic Mission Orchestration • OpenStreetMap</p>
        </div>
      </section>

      <div className="absolute top-24 right-6 bottom-24 w-64 z-10 hidden xl:flex flex-col animate-fade-in pointer-events-auto">
        <GlassCard className="flex flex-col h-full !p-4 border-white/20 bg-black/80 backdrop-blur-2xl shadow-[0_32px_64px_rgba(0,0,0,0.8)] overflow-hidden rounded-2xl">
          <div className="px-1 mb-4 flex justify-between items-center shrink-0">
            <h4 className="text-[10px] font-black text-white/70 uppercase tracking-[0.25em]">Tactical Units</h4>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 border border-white/10">
              <span className="text-[9px] text-white/50 font-black uppercase tracking-widest">{vehicles.length} Units</span>
            </div>
          </div>
          
          <div className="space-y-2 flex-1 overflow-y-auto pr-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-neutral-600">
                <Loader2 className="animate-spin" size={16} />
                <span className="text-[8px] font-black uppercase tracking-widest">Scanning Grid...</span>
              </div>
            ) : vehicles.map((vehicle) => (
              <div 
                key={vehicle.id}
                onClick={() => {
                  setSelectedVehicleId(vehicle.id);
                  vectorToVehicle(vehicle);
                }}
                className={cn(
                  "p-3 rounded-xl border transition-all cursor-pointer group relative overflow-hidden",
                  selectedVehicleId === vehicle.id 
                    ? "bg-white/10 border-white/30 shadow-xl" 
                    : "bg-white/5 border-white/10 hover:bg-white/[0.08] hover:border-white/20"
                )}
              >
                <div className="flex items-center gap-3 relative z-10">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                    vehicle.is_mission_active ? "text-green-400 bg-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.2)]" : "text-neutral-500 bg-white/5"
                  )}>
                    <Truck size={15} />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-black text-white uppercase tracking-tight">{vehicle.id}</h5>
                    <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest truncate max-w-[120px]">{vehicle.profiles?.full_name || "Unknown Operator"}</p>
                  </div>
                </div>
                {vehicle.is_mission_active && (
                   <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-green-500 animate-pulse" />
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {selectedVehicle && (
        <div className="absolute bottom-6 left-6 w-[280px] z-[50] animate-fade-in-up pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          <GlassCard className="!p-4 border-white/20 bg-[#050505]/98 backdrop-blur-3xl rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.8)]">
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-blue-500 shadow-lg">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h5 className="text-[8px] font-black text-neutral-600 uppercase tracking-[0.3em] leading-none mb-1">Field Objective</h5>
                    <h4 className="text-base font-black text-white italic uppercase tracking-tighter leading-none">
                      Unit: {selectedVehicle.profiles?.full_name || "LEAD UNKNOWN"}
                    </h4>
                    <p className="text-[9px] text-neutral-600 font-bold uppercase tracking-widest mt-1">
                      NIC: {selectedVehicle.profiles?.nic_number || "200375695"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-1">
                <h3 className="text-lg font-black text-blue-500 italic uppercase tracking-tighter">
                  {recentOrder?.id || "NO MISSION"}
                </h3>
                <div className={cn(
                  "px-2 py-0.5 rounded text-[8px] font-black border uppercase tracking-widest",
                  recentOrder?.status === 'delivered' 
                    ? "bg-green-500/20 text-green-500 border-green-500/30" 
                    : "bg-blue-500/20 text-blue-500 border-blue-500/30"
                )}>
                  {recentOrder?.status || "STANDBY"}
                </div>
              </div>

              {recentOrder?.pod_image_url ? (
                <div className="relative group rounded-xl overflow-hidden border border-white/10 bg-black h-32 flex items-center justify-center shadow-lg">
                  <img 
                    src={recentOrder.pod_image_url} 
                    alt="Tactical Evidence"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3 flex justify-between items-end">
                    <p className="text-[8px] text-white/50 font-bold italic">Destination: {recentOrder.destination_country || "Sri Lanka"}</p>
                    <a 
                      href={recentOrder.pod_image_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[7px] font-black text-white uppercase tracking-widest bg-blue-600 px-2 py-1 rounded-lg shadow-lg hover:bg-blue-500 transition-all opacity-0 group-hover:opacity-100"
                    >
                      Intel View
                    </a>
                  </div>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center gap-2 border border-dashed border-white/5 rounded-xl bg-white/[0.02]">
                  <Camera className="text-neutral-800" size={24} />
                  <p className="text-[8px] text-neutral-600 font-black uppercase tracking-widest italic">Awaiting Evidence</p>
                </div>
              )}

              <div className="flex gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedVehicle.profiles?.phone_number) {
                      window.location.href = `tel:${selectedVehicle.profiles.phone_number}`;
                    } else {
                      alert("TACTICAL ERROR: No registered contact frequency for this unit.");
                    }
                  }}
                  className="flex-1 py-2.5 flex items-center justify-center gap-2 bg-white/[0.03] border border-white/10 rounded-xl text-[9px] font-black text-white uppercase tracking-widest hover:bg-white/5 hover:border-white/20 transition-all group active:scale-[0.98]"
                >
                  <Phone size={12} className="text-neutral-500 group-hover:text-white transition-colors" /> Contact
                </button>
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!selectedVehicle.driver_id) return;
                    try {
                      await supabase.from('notifications').insert({
                        user_id: selectedVehicle.driver_id,
                        title: "TACTICAL SIGNAL",
                        message: "Strategic Command is requesting an immediate situational report.",
                        type: 'warning'
                      });
                      alert("SIGNAL TRANSMITTED: Unit has been notified.");
                    } catch (err) {
                      console.error('Signal transmission failure:', err);
                    }
                  }}
                  className="flex-1 py-2.5 flex items-center justify-center gap-2 bg-white/[0.03] border border-white/10 rounded-xl text-[9px] font-black text-white uppercase tracking-widest hover:bg-white/5 hover:border-white/20 transition-all group active:scale-[0.98]"
                >
                  <Bell size={12} className="text-neutral-500 group-hover:text-white transition-colors" /> Signal
                </button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      <AnimatePresence>
        {showDispatchModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowDispatchModal(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md"
            >
              <GlassCard className="!p-8 border-white/10 shadow-3xl bg-black/60 backdrop-blur-3xl rounded-[32px]">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tighter italic uppercase underline decoration-blue-500/50 underline-offset-8">Tactical Sync</h3>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-4">Assign Active Pipeline to {selectedVehicle?.id}</p>
                  </div>
                  <button onClick={() => setShowDispatchModal(false)} className="text-neutral-500 hover:text-white transition-colors p-2"><X size={24} /></button>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {pendingOrders.length === 0 ? (
                    <div className="py-12 text-center border border-white/5 rounded-2xl bg-white/[0.02]">
                       <Clock className="mx-auto text-neutral-800 mb-3" size={32} />
                       <p className="text-[10px] text-neutral-600 font-black uppercase tracking-widest">No Pending Deliveries In Queue</p>
                    </div>
                  ) : pendingOrders.map((order) => (
                    <button
                      key={order.id}
                      disabled={isDispatching}
                      onClick={() => handleQuickDispatch(order.id)}
                      className="w-full p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/30 hover:bg-white/[0.08] transition-all text-left flex items-center justify-between group active:scale-[0.98] disabled:opacity-50"
                    >
                      <div>
                        <p className="text-[9px] text-blue-500 font-black uppercase tracking-widest mb-1">{order.id}</p>
                        <h5 className="text-sm font-black text-white uppercase italic">{order.client_name}</h5>
                        <p className="text-[10px] text-neutral-500 font-bold mt-0.5">{order.item_specification}</p>
                      </div>
                      <ArrowRight size={18} className="text-neutral-700 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => setShowDispatchModal(false)}
                  className="w-full py-4 mt-8 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black text-neutral-500 uppercase tracking-[.3em] hover:text-white transition-all"
                >
                  Cancel Protocol
                </button>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
