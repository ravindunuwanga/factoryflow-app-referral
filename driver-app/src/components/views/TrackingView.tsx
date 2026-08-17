"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Navigation, 
  CheckCircle2, 
  AlertCircle,
  Phone,
  MessageSquare,
  ShieldCheck,
  MapPin
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import GlassCard from "@/components/ui/GlassCard";
import { useGeolocation } from "@/hooks/useGeolocation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-neutral-900 animate-pulse flex items-center justify-center">
      <Navigation className="text-neutral-700 animate-spin" size={48} />
    </div>
  )
});

export default function TrackingView() {
  const { id } = useParams();
  const router = useRouter();
  const [delivery, setDelivery] = useState<any>(null);
  const [isTracking, setIsTracking] = useState(false);
  
  const vehicleId = delivery?.vehicle_id || 'TRK-01'; 
  const { location, error: geoError } = useGeolocation(isTracking ? vehicleId : null);

  useEffect(() => {
    if (!id) return;
    async function fetchDelivery() {
      const { data } = await supabase
        .from('deliveries')
        .select(`*, orders (order_number, client_name)`)
        .eq('id', id)
        .single();
      
      if (data) {
        setDelivery(data);
        if (data.status === 'in_transit') setIsTracking(true);
      }
    }
    fetchDelivery();
  }, [id]);

  const handleStartTrip = async () => {
    setIsTracking(true);
    await supabase.from('deliveries').update({ status: 'in_transit', started_at: new Date().toISOString() }).eq('id', id);
    await supabase.from('vehicles').update({ status: 'on_delivery' }).eq('id', delivery.vehicle_id);
  };

  return (
    <div className="flex-1 flex flex-col relative h-screen overflow-hidden">
      <div className="absolute inset-0 z-0">
        <MapComponent currentLocation={location} />
      </div>
      <div className="absolute top-0 left-0 right-0 p-6 z-10 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/')} className="w-10 h-10 rounded-full glass flex items-center justify-center text-white">
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <h1 className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Active Trip</h1>
            <p className="text-lg font-bold text-white">{delivery?.orders?.order_number || '...'}</p>
          </div>
          <div className="w-10 h-10 rounded-full glass flex items-center justify-center text-blue-400">
            <ShieldCheck size={20} />
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
        <AnimatePresence mode="wait">
          {!isTracking ? (
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} key="start">
              <GlassCard className="border-blue-500/30 bg-blue-500/5 backdrop-blur-2xl">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-500">
                    <Navigation size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Stationery Supply</h2>
                    <p className="text-sm text-neutral-400">Port of Colombo, Terminal 2</p>
                  </div>
                </div>
                <button onClick={handleStartTrip} className="btn-primary">
                  <Navigation size={20} />
                  Start Delivery Trip
                </button>
              </GlassCard>
            </motion.div>
          ) : (
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} key="tracking" className="space-y-4">
              <div className="glass px-4 py-2 rounded-full w-max mx-auto border-green-500/30 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-bold tracking-widest text-green-500 uppercase">Live Tracking Active</span>
              </div>
              <GlassCard className="!p-0 overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <MapPin size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">Current Destination</p>
                        <p className="text-sm font-bold text-white">Colombo 07, Race Course</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">ETA</p>
                      <p className="text-lg font-bold text-blue-400">12:15 PM</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 btn-secondary !py-2.5 text-xs"><Phone size={14} /> Call</button>
                    <button className="flex-1 btn-secondary !py-2.5 text-xs"><MessageSquare size={14} /> Chat</button>
                  </div>
                </div>
                <div className="p-6">
                  <Link href={`/pod/${id}`} className="w-full">
                    <button className="btn-primary !bg-green-500 !text-white hover:!bg-green-600">
                      <CheckCircle2 size={20} />
                      Mark as Delivered
                    </button>
                  </Link>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
        {geoError && (
          <div className="mt-4 glass border-red-500/50 p-4 rounded-xl flex items-center gap-3 text-red-500 animate-fade-in">
            <AlertCircle size={20} />
            <p className="text-xs font-bold">GPS Error: {geoError}</p>
          </div>
        )}
      </div>
    </div>
  );
}
