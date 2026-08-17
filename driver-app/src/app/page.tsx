"use client";

import { useState, useEffect } from "react";
import { 
  Truck, 
  MapPin, 
  CheckCircle2, 
  Navigation, 
  Camera as CameraIcon, 
  LogOut,
  Phone,
  Power,
  Activity,
  ShieldCheck,
  Clock,
  Bell
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Geolocation } from "@capacitor/geolocation";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { LocalNotifications } from "@capacitor/local-notifications";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import GlassCard from "@/components/ui/GlassCard";

export default function DriverDashboard() {
  const router = useRouter();
  const [isDriving, setIsDriving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [vehicle, setVehicle] = useState<any>(null);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [scheduledStart, setScheduledStart] = useState<string | null>(null);
  const [timeUntilStart, setTimeUntilStart] = useState<string>("");

  const [missionAlert, setMissionAlert] = useState<any | null>(null);

  useEffect(() => {
    fetchDriverIdentity();
    requestSystemPermissions();
    const missionInterval = setInterval(fetchActiveMission, 5000);
    setupRealtimeSubscription();

    return () => clearInterval(missionInterval);
  }, []);

  const requestSystemPermissions = async () => {
    try {
      await Geolocation.requestPermissions();
    } catch (err) {
      console.error(err);
    }
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const showNativeNotification = async (title: string, body: string) => {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: title,
            body: body,
            id: Math.floor(Math.random() * 100000),
            schedule: { at: new Date(Date.now() + 200) }
          }
        ]
      });
    } catch (err) {
      console.error(err);
    }
  };

  const setupRealtimeSubscription = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const channel = supabase
      .channel(`mission-sync-${user.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications', 
        filter: `user_id=eq.${user.id}` 
      }, (payload) => {
        if (payload.new) {
          const friendlyTitle = "🚚 New Delivery Assigned";
          const friendlyMessage = payload.new.message || "A new delivery order has been assigned to you. Tap to open map navigation.";
          setMissionAlert({ title: friendlyTitle, message: friendlyMessage });
          showNativeNotification(friendlyTitle, friendlyMessage);
          fetchActiveMission(user.id);
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `assigned_driver_id=eq.${user.id}`
      }, (payload) => {
        showNativeNotification("📦 Delivery Order Updated", "Your delivery details have been updated by management.");
        fetchActiveMission(user.id);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const fetchDriverIdentity = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    let { data: vehicleData } = await supabase.from('vehicles').select('*').eq('driver_id', user.id).maybeSingle();
    
    if (!vehicleData && profileData) {
      const generatedPlate = `NC-${Math.floor(1000 + Math.random() * 9000)}`;
      const { data: createdVehicle } = await supabase
        .from('vehicles')
        .insert({
          id: generatedPlate,
          vehicle_type: 'Truck',
          driver_id: user.id,
          status: 'idle'
        })
        .select()
        .single();
      vehicleData = createdVehicle;
    }

    if (profileData) {
      setProfile(profileData);
      setVehicle(vehicleData);
      fetchActiveMission(user.id);
    }
  };

  const fetchActiveMission = async (uid?: string) => {
    const userId = uid || profile?.id;
    if (!userId) return;

    const { data: missions } = await supabase
      .from('orders')
      .select('*')
      .eq('assigned_driver_id', userId)
      .in('status', ['pending', 'in_production', 'in_transit'])
      .order('created_at', { ascending: false });

    if (missions && missions.length > 0) {
      setActiveOrder(missions[0]);
      setScheduledStart(missions[0].scheduled_start_at);
      if (missions[0].status === 'in_transit') {
        setIsDriving(true);
      }
    } else {
      setActiveOrder(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleStartGoogleMapsNavigation = async () => {
    if (!activeOrder) {
      alert("No active delivery assigned.");
      return;
    }

    try {
      await Geolocation.requestPermissions();
    } catch (err) {
      console.error(err);
    }

    if (!isDriving) {
      setIsDriving(true);
      
      await supabase.from('orders').update({ 
        status: 'in_transit' 
      }).eq('id', activeOrder.id);

      if (vehicle?.id) {
        await supabase.from('vehicles').update({ 
          is_mission_active: true,
          current_order_id: activeOrder.id,
          status: 'in_transit'
        }).eq('id', vehicle.id);
      }
    }

    const destinationText = `${activeOrder.item_specification || ''}, ${activeOrder.destination_country || 'Sri Lanka'}`;
    const encodedDest = encodeURIComponent(destinationText);

    const isAndroid = /android/i.test(navigator.userAgent);
    if (isAndroid) {
      window.location.href = `google.navigation:q=${encodedDest}&mode=d`;
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedDest}&travelmode=driving`, '_system');
    }
  };

  const handleCall = () => {
    if (!activeOrder?.contact_number) {
      alert("No contact phone number recorded for this order.");
      return;
    }
    window.location.href = `tel:${activeOrder.contact_number}`;
  };

  const [isFinishing, setIsFinishing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleEndMission = async () => {
    if (!activeOrder) return;
    
    try {
      setIsFinishing(true);

      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera
      });

      if (!image || !image.base64String) {
        throw new Error("Delivery photo capture cancelled.");
      }

      const fileName = `pod_${activeOrder.id}_${Date.now()}.jpg`;
      const byteCharacters = atob(image.base64String);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('deliveries')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('deliveries')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'delivered',
          pod_image_url: publicUrl,
          delivered_at: new Date().toISOString()
        })
        .eq('id', activeOrder.id);

      if (updateError) throw updateError;

      if (vehicle?.id) {
        await supabase.from('vehicles').update({ 
          is_mission_active: false, 
          current_order_id: null,
          status: 'idle'
        }).eq('id', vehicle.id);
      }

      setShowSuccess(true);
      setIsDriving(false);
      
      setTimeout(() => {
        setActiveOrder(null);
        setShowSuccess(false);
      }, 3000);
      
    } catch (err: any) {
      alert("Error completing delivery: " + err.message);
    } finally {
      setIsFinishing(false);
    }
  };

  useEffect(() => {
    const ticker = setInterval(() => {
      if (!scheduledStart || isDriving) return;

      const now = new Date();
      const start = new Date(scheduledStart);
      const diff = start.getTime() - now.getTime();

      if (diff <= 0) {
        setIsDriving(true);
      } else {
        const hrs = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeUntilStart(`${hrs}h ${mins}m ${secs}s`);
      }
    }, 1000);

    return () => clearInterval(ticker);
  }, [scheduledStart, isDriving, activeOrder, vehicle]);

  useEffect(() => {
    let timerId: any;

    const startGpsTracking = async () => {
      const updateGps = async () => {
        try {
          const position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
          });

          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocation({ lat, lng });

          if (vehicle?.id) {
            await supabase.from('vehicles').update({
              current_lat: lat,
              current_lng: lng,
              last_latitude: lat,
              last_longitude: lng,
              last_updated: new Date().toISOString()
            }).eq('id', vehicle.id);

            await supabase.from('gps_logs').insert({
              vehicle_id: vehicle.id,
              latitude: lat,
              longitude: lng,
              speed: position.coords.speed || 0,
              timestamp: new Date().toISOString()
            });
          }
        } catch (err) {
          console.error("GPS Sync Error:", err);
        }
      };

      updateGps();
      timerId = setInterval(updateGps, 3000);
    };

    if (profile?.id && vehicle?.id) {
      startGpsTracking();
    }

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [profile?.id, vehicle?.id]);

  return (
    <div className="min-h-screen bg-[#020202] text-white p-4 max-w-md mx-auto flex flex-col gap-6 font-sans select-none">
      <div className={cn(
        "fixed inset-0 pointer-events-none transition-all duration-1000 blur-[120px] opacity-20",
        isDriving ? "bg-emerald-600/30" : "bg-blue-600/20"
      )} />

      <AnimatePresence>
        {missionAlert && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setMissionAlert(null)} />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-xs bg-black border border-emerald-500/30 rounded-[32px] p-8 shadow-[0_0_80px_rgba(16,185,129,0.3)] overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500 animate-pulse" />
              <div className="flex flex-col items-center text-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <Bell className="animate-bounce" size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black uppercase text-white">{missionAlert.title}</h3>
                  <p className="text-xs text-neutral-300 font-medium leading-relaxed">{missionAlert.message}</p>
                </div>
                <button 
                  onClick={() => setMissionAlert(null)}
                  className="w-full py-4 bg-emerald-600 rounded-2xl text-xs font-black uppercase tracking-wider active:scale-95 transition-all text-white"
                >
                  OK, Got It
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="flex justify-between items-center py-2 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-white shadow-xl relative overflow-hidden group">
            <Truck size={22} className="relative z-10 group-active:scale-110 transition-transform" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
          </div>
          <div>
            <h4 className="text-sm font-black uppercase tracking-tight italic">{profile?.full_name || "Driver HUB"}</h4>
            <div className="flex items-center gap-1.5">
               <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isDriving ? "bg-emerald-500" : "bg-blue-500")} />
               <p className="text-[10px] text-neutral-400 font-black uppercase tracking-wider">
                 {isDriving ? "Delivery In Transit" : "Ready for Order"} • {vehicle?.id || "NO-VEHICLE"}
               </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {missionAlert && (
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 animate-pulse cursor-pointer" onClick={() => setMissionAlert(missionAlert)}>
              <Bell size={18} />
            </div>
          )}
          <button 
            onClick={handleLogout}
            className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-neutral-500 hover:text-white transition-colors border border-white/5 active:scale-95"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {!activeOrder && (
        <GlassCard className="!p-8 space-y-4 flex flex-col items-center text-center">
             <div className="w-20 h-20 rounded-full bg-emerald-500/5 flex items-center justify-center text-emerald-500/30">
               <Activity size={32} />
             </div>
             <p className="text-[10px] text-neutral-400 font-black uppercase tracking-widest">Waiting for New Delivery Order</p>
             <h2 className="text-xl font-black italic uppercase text-neutral-300">Driver Standby</h2>
             {location && (
               <div className="text-[10px] text-emerald-400 font-mono font-bold mt-2 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                 Live Location: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
               </div>
             )}
        </GlassCard>
      )}

      <AnimatePresence>
        {activeOrder && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-4 relative z-10"
          >
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                 <ShieldCheck size={14} className="text-emerald-500" />
                 <h5 className="text-[11px] font-black text-neutral-400 uppercase tracking-wider">Active Delivery Order</h5>
              </div>
              <span className="text-[11px] font-black text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">#{activeOrder.id}</span>
            </div>
            
            <GlassCard className="!p-6 space-y-6">
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-inner">
                  <MapPin size={28} />
                </div>
                <div className="space-y-1 mt-1">
                  <p className="text-[10px] text-neutral-400 font-black uppercase tracking-wider leading-none mb-1">Destination Address</p>
                  <p className="text-base font-black text-white italic line-clamp-1">{activeOrder.destination_country || 'Sri Lanka'}</p>
                  <div className="flex items-center gap-1.5 mt-1 pt-1 border-t border-white/5">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                     <p className="text-[11px] text-neutral-300 font-bold uppercase">{activeOrder.client_name || activeOrder.client}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-6 bg-white/[0.01] -mx-6 px-6 pb-2">
                <div className="space-y-1">
                  <p className="text-[10px] text-neutral-400 uppercase font-black tracking-wider flex items-center gap-1">
                    <Activity size={12} /> Distance
                  </p>
                  <p className="text-base font-black text-white italic">{activeOrder.distance || '4.2 km'}</p>
                </div>
                <div className="space-y-1 border-l border-white/5 pl-4">
                  <p className="text-[10px] text-neutral-400 uppercase font-black tracking-wider flex items-center gap-1">
                    <Clock size={12} /> GPS Location
                  </p>
                  <p className="text-base font-black text-white italic">{location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Detecting...'}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={handleStartGoogleMapsNavigation}
                  className="flex-1 flex items-center justify-center gap-2 py-4 px-4 rounded-2xl bg-emerald-600 border border-emerald-400 text-white font-black text-xs uppercase tracking-wider transition-all active:scale-[0.95] shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:bg-emerald-500"
                >
                  <Navigation size={18} /> OPEN GOOGLE MAPS NAVIGATE
                </button>
                <button 
                  onClick={handleCall}
                  className="w-14 flex items-center justify-center rounded-2xl bg-white/10 border border-white/20 text-white transition-all active:scale-[0.95] hover:bg-white/20"
                >
                  <Phone size={20} />
                </button>
              </div>
            </GlassCard>

            <button 
              onClick={handleEndMission}
              disabled={isFinishing || showSuccess}
              className={cn(
                "w-full flex items-center justify-between p-7 rounded-[32px] border transition-all group relative overflow-hidden active:scale-[0.98] shadow-2xl",
                showSuccess 
                  ? "bg-green-600 border-green-400 shadow-[0_0_30px_rgba(34,197,94,0.5)]" 
                  : isFinishing 
                    ? "bg-white/[0.01] border-white/5 opacity-40 cursor-not-allowed" 
                    : "bg-blue-600 border-blue-400 shadow-[0_0_25px_rgba(59,130,246,0.3)] hover:bg-blue-500"
              )}
            >
              <div className="flex items-center gap-5 relative z-10 font-black">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors border border-white/10 bg-white/10",
                  showSuccess ? "text-white" : "text-white/80 group-hover:text-white"
                )}>
                  {showSuccess ? <CheckCircle2 size={26} /> : isFinishing ? <Activity size={26} className="animate-spin" /> : <CameraIcon size={26} />}
                </div>
                <div className="text-left font-black">
                  <p className="text-sm font-black text-white uppercase italic tracking-tighter">
                    {showSuccess ? "✓ DELIVERY FINISHED" : "✓ COMPLETE DELIVERY"}
                  </p>
                  <p className="text-[10px] text-white/70 uppercase tracking-widest font-black">
                    {showSuccess ? "PHOTO SAVED SUCCESSFULLY" : isFinishing ? "SAVING..." : "TAKE PHOTO TO FINISH DELIVERY"}
                  </p>
                </div>
              </div>
              <CheckCircle2 size={24} className={cn("relative z-10 transition-colors", showSuccess ? "text-white" : "text-white")} />
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-auto py-8 text-center">
        <div className="flex items-center justify-center gap-2 opacity-30 mb-2">
           <div className="h-px w-8 bg-white" />
           <p className="text-[9px] font-black uppercase tracking-[0.5em] text-white">Driver HUB</p>
           <div className="h-px w-8 bg-white" />
        </div>
        <p className="text-[8px] font-bold text-neutral-700 uppercase tracking-widest italic">FactoryFlow Driver App • v2.1</p>
      </div>
    </div>
  );
}
