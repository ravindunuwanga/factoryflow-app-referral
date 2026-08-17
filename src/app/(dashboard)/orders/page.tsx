"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  Download,
  Plus,
  ArrowUpDown,
  X,
  QrCode,
  Calendar,
  User,
  Package as PackageIcon,
  Tag,
  Truck,
  ShieldCheck,
  Clock,
  Loader2,
  Navigation,
  ChevronRight,
  Camera,
  CheckCircle2
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import TacticalSelect from "@/components/ui/TacticalSelect";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
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

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [role, setRole] = useState("admin");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  
  // Dispatch State
  const [dispatchOrder, setDispatchOrder] = useState<any | null>(null);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [isDispatching, setIsDispatching] = useState(false);
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);

  // New Order State
  const [newOrderForm, setNewOrderForm] = useState({
    id: '',
    region: 'local',
    client_name: '',
    item_specification: 'Standard Logistics Payload',
    destination_country: 'Sri Lanka',
    quantity: 1,
    priority: 'medium',
    contact_number: ''
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchAvailableDrivers();
    fetchUserRole();

    // ORDER PULSE: High-resiliency mission synchronization
    const channel = supabase
      .channel('order-pulse')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'orders' 
      }, (p) => {
        console.log('[PULSE] Order Hub Event:', p.eventType);
        fetchOrders();
      })
      .subscribe((status) => {
        console.log('[PULSE] Order Hub subscription status:', status);
      });

    return () => { 
      console.log('[PULSE] Deactivating Order Hub subscription...');
      supabase.removeChannel(channel); 
    };
  }, []);

  const fetchUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      setRole(profile?.role || user.user_metadata?.role || "admin");
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          assigned_driver:profiles!assigned_driver_id(full_name, nic_number, phone_number)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      console.error('Order fetch failure:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableDrivers = async () => {
    // Only fetch users with role 'driver'
    const { data } = await supabase.from('profiles').select('*').eq('role', 'driver');
    setDrivers(data || []);
  };

  const handleExecuteDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchOrder) return;
    
    if (!selectedDriver) {
      alert("MISSION ERROR: No personnel selected for unit assignment.");
      return;
    }
    
    if (!scheduledAt) {
      alert("MISSION ERROR: Mission commencement time must be specified.");
      return;
    }
    
    setIsDispatching(true);
    try {
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          assigned_driver_id: selectedDriver,
          scheduled_start_at: new Date(scheduledAt).toISOString(),
          status: 'in_production'
        })
        .eq('id', dispatchOrder.id);

      if (orderError) throw orderError;

      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({
          is_mission_active: true,
          current_order_id: dispatchOrder.id,
          status: 'in_transit'
        })
        .eq('driver_id', selectedDriver);

      await supabase.from('notifications').insert({
        user_id: selectedDriver,
        title: "🚚 New Delivery Order Assigned",
        message: `New Order #${dispatchOrder.id} assigned to you. Open app to view destination address.`,
        type: 'info'
      });

      await fetchOrders();
      setDispatchOrder(null);
      setSelectedDriver("");
      setScheduledAt("");
      
      alert(`Order #${dispatchOrder.id} has been successfully assigned to driver.`);
    } catch (err: any) {
      alert("Dispatch Failure: " + err.message);
    } finally {
      setIsDispatching(false);
    }
  };

  const handleUpdateStage = async (order: any) => {
    if (!order) return;
    const currentStage = order.production_stage || 1;
    if (currentStage < STAGES.length) {
      setIsUpdatingStage(true);
      const nextStage = currentStage + 1;
      
      const { error } = await supabase
        .from('orders')
        .update({ 
          production_stage: nextStage,
          status: nextStage === STAGES.length ? 'completed' : 'in_production'
        })
        .eq('id', order.id);
      
      if (!error) {
        fetchOrders();
        // Update selected order reference locally
        setSelectedOrder({
          ...order,
          production_stage: nextStage,
          status: nextStage === STAGES.length ? 'completed' : 'in_production'
        });
      }
      setIsUpdatingStage(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderForm.id || !newOrderForm.client_name) {
      alert("Mission Critical Error: Required fields are missing.");
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase
        .from('orders')
        .insert([{
          ...newOrderForm,
          status: 'pending',
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      setShowNewOrder(false);
      setNewOrderForm({
        id: '',
        region: 'local',
        client_name: '',
        item_specification: 'Standard Logistics Payload',
        destination_country: 'Sri Lanka',
        quantity: 1,
        priority: 'medium',
        contact_number: ''
      });
      fetchOrders();
    } catch (err: any) {
      alert("Deployment Failure: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const filteredOrders = orders.filter(order => 
    order.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-10 relative">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white mb-2 uppercase italic">
            {role === 'logistics' ? "Strategic Dispatch Hub" : "Mission Ledger"}
          </h2>
          <p className="text-neutral-400 font-medium tracking-tight">
            {role === 'logistics' ? "Synchronizing active personnel to mission-critical delivery pipelines." : "Managing global and domestic production pipelines."}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowQRScanner(true)}
            className="btn-secondary !px-6 flex items-center gap-2"
          >
            <QrCode size={18} /> Scan QR
          </button>
          <button 
            onClick={() => setShowNewOrder(true)}
            className="btn-primary !px-6 flex items-center gap-2 border border-white/10 shadow-[0_20px_40px_-10px_rgba(59,130,246,0.3)]"
          >
            <Plus size={18} /> {role === 'logistics' ? "Provision New Mission" : "New Work Order"}
          </button>
        </div>
      </section>

      <GlassCard className="!p-0 overflow-hidden border-white/5">
        <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/[0.01]">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
            <input 
              type="text" 
              placeholder="Search by ID, client or item..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20 w-full"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase text-neutral-400 hover:text-white transition-all tracking-widest">
              <Download size={14} className="inline mr-2" /> Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.02] text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500 border-b border-white/5">
                <th className="px-6 py-5">Mission ID</th>
                <th className="px-6 py-5">Entity</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5">Region</th>
                <th className="px-6 py-5">Priority</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <Loader2 className="animate-spin inline text-blue-500 mb-4" size={32} />
                    <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">Scanning Archive...</p>
                  </td>
                </tr>
              ) : filteredOrders.map((order) => (
                <tr 
                  key={order.id} 
                  className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                >
                  <td className="px-6 py-4" onClick={() => setSelectedOrder(order)}>
                    <p className="text-sm font-black text-white tracking-widest uppercase">{order.id}</p>
                    <p className="text-[10px] text-neutral-600 font-mono mt-1">{new Date(order.created_at).toLocaleDateString()}</p>
                  </td>
                  <td className="px-6 py-4" onClick={() => setSelectedOrder(order)}>
                    <p className="text-sm font-black text-white uppercase italic">{order.client_name}</p>
                    <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">
                      {order.assigned_driver?.full_name ? `Lead: ${order.assigned_driver.full_name}` : order.item_specification}
                    </p>
                  </td>
                  <td className="px-6 py-4" onClick={() => setSelectedOrder(order)}>
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase border",
                      order.status === 'completed' || order.status === 'delivered' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                      order.status === 'in_production' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                      "bg-neutral-800 text-neutral-500 border-white/5"
                    )}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                     <span className={cn(
                       "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border",
                       order.region === 'international' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                     )}>
                       {order.region === 'international' ? `Global (${order.destination_country})` : "Domestic"}
                     </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      order.priority === 'critical' ? "bg-red-500 shadow-[0_0_8px_#ef4444]" :
                      order.priority === 'high' ? "bg-orange-500" :
                      "bg-blue-500"
                    )} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {order.status === 'pending' && (
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setDispatchOrder(order);
                            setSelectedDriver(order.assigned_driver_id || "");
                            if (order.scheduled_start_at) {
                              const d = new Date(order.scheduled_start_at);
                              const localStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                              setScheduledAt(localStr);
                            } else {
                              setScheduledAt("");
                            }
                          }}
                          className="p-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition-all border border-blue-500/20"
                          title="Authorize Dispatch"
                        >
                          <ShieldCheck size={16} />
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }} className="p-2 bg-white/5 rounded-lg text-neutral-400 hover:text-white transition-all"><Eye size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* STRATEGIC DISPATCH MODAL */}
      {dispatchOrder && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setDispatchOrder(null)} />
           <GlassCard className="relative w-full max-w-md !p-8 animate-in zoom-in-95 duration-200 border-white/10 shadow-3xl">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tighter italic uppercase">Strategic Dispatch</h3>
                  <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1">Personnel & Temporal Assignment</p>
                </div>
                <button onClick={() => setDispatchOrder(null)} className="text-neutral-500 hover:text-white transition-colors"><X size={24} /></button>
              </div>

              <form onSubmit={handleExecuteDispatch} className="space-y-6">
                 <div className="p-4 bg-white/5 rounded-xl border border-white/5 mb-6">
                    <p className="text-[9px] text-neutral-500 font-black uppercase tracking-widest mb-1">Target Mission</p>
                    <p className="text-sm font-black text-white uppercase italic">{dispatchOrder.id} • {dispatchOrder.client_name}</p>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Assign Operational Driver</label>
                    <TacticalSelect 
                      options={drivers.map(d => ({ value: d.id, label: `${d.full_name} (${d.nic_number})` }))}
                      value={selectedDriver}
                      onChange={setSelectedDriver}
                      placeholder="Select Personnel..."
                    />
                 </div>

                 <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Mission Commencement (SLST)</label>
                    
                    <div className="grid grid-cols-4 gap-2 mb-2">
                       {[
                         { label: 'NOW', offset: 0 },
                         { label: '+1H', offset: 60 },
                         { label: '+4H', offset: 240 },
                         { label: '+1D', offset: 1440 }
                       ].map((preset) => (
                         <button
                           key={preset.label}
                           type="button"
                           onClick={() => {
                             const d = new Date();
                             d.setMinutes(d.getMinutes() + preset.offset);
                             // Localize to SLST (ISO-like string for datetime-local)
                             const localStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                             setScheduledAt(localStr);
                           }}
                           className="py-2 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-neutral-400 hover:text-blue-400 hover:border-blue-500/30 transition-all uppercase"
                         >
                           {preset.label}
                         </button>
                       ))}
                    </div>

                    <div className="relative">
                       <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                       <input 
                         type="datetime-local" 
                         required
                         value={scheduledAt}
                         onChange={(e) => setScheduledAt(e.target.value)}
                         className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50"
                       />
                    </div>
                 </div>

                 <button 
                   type="submit"
                   disabled={isDispatching}
                   className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-[11px] font-black text-white uppercase tracking-[0.2em] mt-4 transition-all shadow-[0_20px_40px_-10px_rgba(59,130,246,0.3)] flex items-center justify-center gap-2"
                 >
                   {isDispatching ? <Loader2 className="animate-spin" size={16} /> : <><ShieldCheck size={16} /> Authorize Mission</>}
                 </button>
              </form>
           </GlassCard>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
          <GlassCard className="relative w-full max-w-xl !p-0 overflow-hidden border-white/10 animate-fade-in-up">
            <div className="p-8 border-b border-white/5 bg-white/[0.01]">
               <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">{selectedOrder.region} Operation</span>
                      {(selectedOrder.status === 'delivered' || selectedOrder.status === 'completed') && (
                        <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[8px] font-black uppercase tracking-widest border border-green-500/20">
                          Mission Complete
                        </span>
                      )}
                    </div>
                    <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic mt-1">{selectedOrder.id}</h3>
                  </div>
                  <button onClick={() => setSelectedOrder(null)} className="p-2 text-neutral-500 hover:text-white transition-colors"><X size={24} /></button>
               </div>
            </div>
            
            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
               {/* 📊 PRODUCTION PIPELINE - Integrated Transformation */}
               <div className="relative pt-6 pb-6 px-2 border-b border-white/5">
                  <p className="text-[10px] text-neutral-500 font-black uppercase tracking-[0.2em] mb-10">Production Execution Pulse</p>
                  
                  <div className="absolute left-6 top-24 bottom-24 w-0.5 bg-white/5 lg:left-0 lg:right-0 lg:top-[128px] lg:bottom-auto lg:h-px lg:bg-white/10" />
                  
                  <div className="grid grid-cols-1 gap-10 lg:grid-cols-7 lg:gap-2 relative">
                    {STAGES.map((stage, i) => {
                      const currentStage = selectedOrder.production_stage || 1;
                      const isMissionComplete = selectedOrder.status === 'delivered' || selectedOrder.status === 'completed';
                      const isCompleted = isMissionComplete || i < currentStage - 1;
                      const isCurrent = !isMissionComplete && i === currentStage - 1;
                      
                      return (
                        <div key={stage} className="flex flex-col items-center group lg:text-center relative">
                          <div className={cn(
                            "w-10 h-10 rounded-full border flex items-center justify-center z-10 transition-all duration-500 shadow-lg",
                            isCompleted ? "bg-white text-black border-white" : 
                            isCurrent ? "bg-blue-600 text-white border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)] scale-110" : 
                            "bg-neutral-900 text-neutral-800 border-neutral-800"
                          )}>
                            {isCompleted ? <CheckCircle2 size={18} /> : <span className="text-[10px] font-black">{i + 1}</span>}
                          </div>
                          <div className="mt-3 space-y-0.5">
                            <p className={cn(
                              "text-[8px] font-black uppercase tracking-[0.1em] transition-colors",
                              isCompleted || isCurrent ? "text-white" : "text-neutral-700"
                            )}>
                              {stage}
                            </p>
                            {isCurrent && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleUpdateStage(selectedOrder); }}
                                disabled={isUpdatingStage}
                                className="text-[9px] text-blue-500 font-black hover:text-white transition-colors underline underline-offset-4"
                              >
                                {isUpdatingStage ? "SYNCING..." : "FINALIZE"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-8 text-left">
                  <div>
                    <p className="text-[9px] text-neutral-500 font-black uppercase tracking-widest mb-2">Primary Entity</p>
                    <p className="text-xl font-black text-white italic">{selectedOrder.client_name}</p>
                    <p className="text-xs text-neutral-400 font-medium leading-relaxed">{selectedOrder.item_specification}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-neutral-500 font-black uppercase tracking-widest mb-2">Designated Target</p>
                    <p className="text-lg font-black text-white italic">{selectedOrder.destination_country}</p>
                    <p className="text-xs text-neutral-400 font-medium">Strategic Corridor: {selectedOrder.region}</p>
                  </div>
               </div>

               {/* Mission Verification Evidence */}
               {selectedOrder.pod_image_url && (
                 <div className="pt-8 border-t border-white/5 text-left">
                   <p className="text-[10px] text-blue-500 font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                     <Camera size={14} /> Mission Intelligence Evidence (POD)
                   </p>
                   <div className="relative group rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-video flex items-center justify-center">
                     <img 
                       src={selectedOrder.pod_image_url} 
                       alt="Proof of Delivery"
                       className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                     />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                        <a 
                          href={selectedOrder.pod_image_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[10px] font-black text-white uppercase tracking-widest hover:underline"
                        >
                          View Full Resolution Intel
                        </a>
                     </div>
                   </div>
                 </div>
               )}

               <div className="pt-8 border-t border-white/5 space-y-8 text-left">
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <p className="text-[9px] text-neutral-500 font-black uppercase tracking-widest mb-2">Tactical Personnel</p>
                      <p className="text-sm font-black text-white uppercase tracking-widest leading-none">{selectedOrder.assigned_driver?.full_name || "UNIT UNASSIGNED"}</p>
                      {selectedOrder.assigned_driver && (
                        <p className="text-[10px] text-neutral-500 font-medium mt-1">
                          NIC: {selectedOrder.assigned_driver.nic_number || "N/A"} • PH: {selectedOrder.assigned_driver.phone_number || "N/A"}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-[9px] text-neutral-500 font-black uppercase tracking-widest mb-2">Operational Priority</p>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          selectedOrder.priority === 'critical' ? "bg-red-500" : "bg-blue-500"
                        )} />
                        <p className="text-xs font-black text-white uppercase tracking-widest">{selectedOrder.priority} Level</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 pb-4">
                    <div>
                      <p className="text-[9px] text-neutral-500 font-black uppercase tracking-widest mb-2">Estimated Commencement</p>
                      <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">
                        {selectedOrder.scheduled_start_at ? new Date(selectedOrder.scheduled_start_at).toLocaleString() : "TBD"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-blue-500 font-black uppercase tracking-widest mb-2 italic">Actual Objective Completion</p>
                      <p className="text-xs font-black text-white uppercase tracking-widest">
                        {selectedOrder.delivered_at ? new Date(selectedOrder.delivered_at).toLocaleString() : 
                         (selectedOrder.status === 'completed' || selectedOrder.status === 'delivered' ? "MISSION OBJECTIVE TERMINATED" : "IN PROGRESS")}
                      </p>
                    </div>
                  </div>
               </div>
            </div>

            <div className="p-8 bg-white/[0.02] border-t border-white/5 flex gap-4">
               <button 
                 onClick={() => alert("Digital BOL Generation Sequence Initialized...")}
                 className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all"
               >
                 Generate Digital BOL
               </button>
               <button 
                 onClick={() => {
                   setDispatchOrder(selectedOrder);
                   setSelectedDriver(selectedOrder.assigned_driver_id || "");
                   if (selectedOrder.scheduled_start_at) {
                     const d = new Date(selectedOrder.scheduled_start_at);
                     const localStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                     setScheduledAt(localStr);
                   } else {
                     setScheduledAt("");
                   }
                   setSelectedOrder(null);
                 }}
                 className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20"
               >
                 Authorize Transit
               </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* New Order Modal */}
      {showNewOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowNewOrder(false)} />
          <GlassCard className="relative w-full max-w-lg !p-8 animate-fade-in-up border-white/10 shadow-3xl">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-white tracking-tighter italic uppercase">Provision New Mission</h3>
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1">Assign global production payload</p>
              </div>
              <button onClick={() => setShowNewOrder(false)} className="text-neutral-500 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleCreateOrder} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="text" 
                  placeholder="Mission ID (ORD-INT-XXX)" 
                  required
                  value={newOrderForm.id}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, id: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-sm text-white focus:outline-none focus:border-blue-500/50 uppercase font-black tracking-widest" 
                />
                <TacticalSelect 
                  options={[
                    { value: 'local', label: 'Domestic Region' },
                    { value: 'international', label: 'Global Operation' }
                  ]}
                  value={newOrderForm.region}
                  onChange={(val) => setNewOrderForm({ ...newOrderForm, region: val })}
                />
              </div>

              <input 
                type="text" 
                placeholder="Client Authority Name" 
                required
                value={newOrderForm.client_name}
                onChange={(e) => setNewOrderForm({ ...newOrderForm, client_name: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500/50" 
              />
              
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="text" 
                  placeholder="Target Destination City" 
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, item_specification: `${e.target.value}` })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500/50" 
                />
                <input 
                  type="text" 
                  placeholder="Destination Country" 
                  value={newOrderForm.destination_country}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, destination_country: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500/50" 
                />
              </div>

              <input 
                type="text" 
                placeholder="Receiver Contact Number (Client Phone)" 
                value={newOrderForm.contact_number}
                onChange={(e) => setNewOrderForm({ ...newOrderForm, contact_number: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500/50" 
              />

              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="number" 
                  placeholder="Payload Quantity" 
                  required
                  value={newOrderForm.quantity || ''}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, quantity: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-sm text-white focus:outline-none focus:border-blue-500/50" 
                />
                <TacticalSelect 
                  options={[
                    { value: 'medium', label: 'Local Priority' },
                    { value: 'high', label: 'Strategic Priority' },
                    { value: 'critical', label: 'Critical Priority' }
                  ]}
                  value={newOrderForm.priority}
                  onChange={(val) => setNewOrderForm({ ...newOrderForm, priority: val })}
                />
              </div>

              <button 
                type="submit"
                disabled={isCreating}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-[11px] font-black text-white uppercase tracking-[0.2em] mt-6 transition-all shadow-[0_20px_40px_-10px_rgba(59,130,246,0.5)] flex items-center justify-center gap-2"
              >
                {isCreating ? <Loader2 className="animate-spin" size={18} /> : "Launch Production Sequence"}
              </button>
            </form>
          </GlassCard>
        </div>
      )}

      {/* QR Scanner Placeholder */}
      {showQRScanner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setShowQRScanner(false)} />
          <div className="relative w-full max-w-sm flex flex-col items-center">
            <div className="w-64 h-64 border-2 border-white/20 rounded-3xl relative flex items-center justify-center overflow-hidden bg-neutral-900 shadow-[0_0_50px_rgba(255,255,255,0.05)]">
              <div className="absolute inset-0 bg-blue-500/5 animate-pulse" />
              <div className="w-48 h-0.5 bg-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 animate-scan shadow-[0_0_10px_#3b82f6]" />
              <QrCode size={48} className="text-neutral-700 opacity-20" />
            </div>
            <p className="text-white font-bold mt-8 tracking-wider uppercase text-sm">Align QR Code within frame</p>
            <p className="text-neutral-500 text-xs mt-2 uppercase tracking-widest">Scanning Production Token...</p>
            <button 
              onClick={() => setShowQRScanner(false)}
              className="mt-12 btn-secondary !px-8 !py-3 font-bold uppercase tracking-[0.2em] text-[10px]"
            >
              Cancel Scan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
