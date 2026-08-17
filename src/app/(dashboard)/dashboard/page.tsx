"use client";

import { useState, useEffect } from "react";

import { 
  Package, 
  Clock, 
  Users,
  ArrowRight,
  BarChart3,
  Factory,
  Truck
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

export default function Dashboard() {
  const [time, setTime] = useState(new Date());
  const [firstName, setFirstName] = useState("User");
  const [role, setRole] = useState<string>("admin");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const full_name = user.user_metadata?.full_name || user.email?.split('@')[0] || "User";
        setFirstName(full_name.split(' ')[0]);

        // Prioritize Database Profile over transient metadata
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        const rawRole = profile?.role || user.user_metadata?.role || "admin";
        const userRole = (typeof rawRole === 'string' ? rawRole : (rawRole?.role || "admin")).toLowerCase();
        setRole(userRole);
      }
      setLoading(false);
    };
    
    fetchUser();
    return () => clearInterval(timer);
  }, []);

  const slTime = time.toLocaleTimeString("en-US", {
    timeZone: "Asia/Colombo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const [stats, setStats] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    fetchHubData();
    
    // COMMAND PULSE: Unified high-resiliency synchronization
    const channel = supabase.channel('command-pulse')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'orders' 
      }, (p) => {
        console.log('[PULSE] Dashboard Order Event:', p.eventType);
        fetchHubData();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'vehicles' 
      }, (p) => {
        console.log('[PULSE] Dashboard Fleet Event:', p.eventType);
        fetchHubData();
      })
      .subscribe((status) => {
        console.log('[PULSE] Command Hub subscription status:', status);
      });

    return () => { 
      console.log('[PULSE] Deactivating Command subscription...');
      supabase.removeChannel(channel); 
    };
  }, [role]);

  const fetchHubData = async () => {
    try {
      // 1. Fetch Stats Aggregates
      const [{ data: orderData }, { data: vehicleData }, { data: recent, error: recentError }, { data: invData }] = await Promise.all([
        supabase.from('orders').select('status, priority, created_at'),
        supabase.from('vehicles').select('status, is_mission_active'),
        supabase.from('orders').select('*, assigned_driver:profiles!assigned_driver_id(full_name)').order('created_at', { ascending: false }).limit(6),
        supabase.from('inventory_items').select('quantity, reorder_level')
      ]);

      if (orderData && vehicleData) {
        // Aggregate Stats
        const activeMissions = orderData.filter(o => o.status === 'in_production').length;
        const totalDelivered = orderData.filter(o => o.status === 'delivered').length;
        const fleetOnRoad = vehicleData.filter(v => v.is_mission_active).length;
        const onlineDrivers = vehicleData.filter(v => v.status !== 'maintenance').length;
        const criticalStock = (invData || []).filter(i => i.quantity <= i.reorder_level).length;
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        const thisWeekOrders = orderData.filter(o => new Date(o.created_at) >= weekAgo).length;

        const userRole = role.toLowerCase();
        const roleStats = userRole === 'logistics' ? [
          { label: "Active Shipments", value: activeMissions.toString(), trend: "up", change: `${thisWeekOrders} this week` },
          { label: "Fleet On-Road", value: `${fleetOnRoad}/${onlineDrivers}`, trend: "up", change: "Full sync active" },
          { label: "Stability Index", value: "94%", trend: "up", change: "System Nominal" },
          { label: "Pending Pickups", value: orderData.filter(o => o.status === 'pending').length.toString(), trend: "up", change: "Awaiting Batch" },
        ] : userRole === 'inventory' ? [
          { label: "Packing Queue", value: orderData.filter(o => o.status === 'in_production').length.toString(), trend: "up", change: "Immediate Action" },
          { label: "Dispatch Readiness", value: orderData.filter(o => o.status === 'completed').length.toString(), trend: "up", change: "Awaiting Pick-up" },
          { label: "Critical Stock", value: `${criticalStock} Items`, trend: criticalStock > 0 ? "up" : "down", change: "Review Stock Hub" },
          { label: "Production Output", value: totalDelivered.toString(), trend: "up", change: "Absolute Total" },
        ] : [
          { label: "Global Active Missions", value: activeMissions.toString(), trend: "up", change: `${activeMissions} in-field` },
          { label: "Fleet Readiness", value: `${onlineDrivers} Units`, trend: "up", change: `${Math.round((fleetOnRoad / Math.max(1, onlineDrivers)) * 100)}% active` },
          { label: "Objective Completion", value: totalDelivered.toString(), trend: "up", change: `+${orderData.filter(o => o.status === 'delivered' && new Date(o.created_at) >= weekAgo).length} this week` },
          { label: "Critical Priority", value: orderData.filter(o => o.priority === 'critical').length.toString(), trend: "up", change: "Tactical Priority" },
        ];
        
        setStats(roleStats);
        setRecentOrders(recent || []);

        // 2. Transform Chart Data (Weekly Production Volume)
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const chartMap = new Map();
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          chartMap.set(days[date.getDay()], { name: days[date.getDay()], production: 0, velocity: 0 });
        }
        orderData.forEach(o => {
          const dayName = days[new Date(o.created_at).getDay()];
          if (chartMap.has(dayName)) {
            const entry = chartMap.get(dayName);
            entry.production += 1;
            entry.velocity += 15; // Simplified velocity metric
          }
        });
        setChartData(Array.from(chartMap.values()));
      }
    } catch (err) {
      console.error('Hub sync failure:', err);
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-8 pb-10">

      {/* Welcome Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2 uppercase tracking-tighter">
            {role === 'admin' ? "COMMAND HQ" : role === 'logistics' ? "LOGISTICS HUB" : role === 'inventory' ? "INVENTORY CONTROL" : "STRATEGIC HUB"}
          </h2>
          <p className="text-neutral-400 font-medium italic uppercase tracking-widest text-[10px] mt-1 pr-4 border-r border-white/10">Welcome Back, {firstName}. Here is your <span className="text-blue-500 font-black">{role}</span> situational report.</p>
          {role === 'inventory' && (
            <Link 
              href="/inventory" 
              className="ml-4 px-3 py-1 bg-blue-500 hover:bg-blue-600 rounded-lg text-[8px] font-black uppercase text-white tracking-widest transition-all flex items-center gap-2"
            >
              <Package size={12} /> Open Inventory Hub
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-neutral-500 uppercase font-black tracking-[0.2em] mb-1">Local Time (SLST)</p>
            <p className="text-sm font-semibold text-white">{slTime}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400">
            <Clock size={18} />
          </div>
        </div>
      </section>

      {/* Real-Time Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.length > 0 ? stats.map((stat) => (
          <GlassCard key={stat.label} className="relative overflow-hidden group border-white/5">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500">
                <Package size={20} />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-[10px] font-black uppercase tracking-widest",
                stat.trend === 'up' ? 'text-green-500' : 'text-red-500'
              )}>
                {stat.change}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-neutral-500 font-black uppercase tracking-[0.1em]">{stat.label}</p>
              <h3 className="text-2xl font-black text-white tracking-tighter italic">{stat.value}</h3>
            </div>
          </GlassCard>
        )) : (
          [1,2,3,4].map(i => <div key={i} className="h-32 rounded-3xl bg-white/[0.02] border border-white/5 animate-pulse" />)
        )}
      </section>

      {/* Main Mission Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <GlassCard className="lg:col-span-2 min-h-[400px] flex flex-col border-white/5">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="text-lg font-black text-white uppercase tracking-tight">
                {role === 'admin' ? "Enterprise Output" : role === 'logistics' ? "Fleet Operational Velocity" : role === 'inventory' ? "Inventory Throughput Pulse" : "Factory Floor Throughput"}
              </h4>
              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                {role === 'logistics' ? "Unit Dispatch Velocity vs Strategic Targets" : "Real-time performance vs Daily Targets"}
              </p>
            </div>
          </div>
          
          <div className="flex-1 w-full h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               {role === 'logistics' ? (
                 <AreaChart data={chartData}>
                   <defs>
                     <linearGradient id="colorVelocity" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                       <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#525252', fontSize: 10}} />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#525252', fontSize: 10}} />
                   <Tooltip 
                     contentStyle={{backgroundColor: '#0a0a0a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff'}}
                     itemStyle={{fontSize: '11px', fontWeight: 'bold'}}
                   />
                   <Area type="monotone" dataKey="velocity" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVelocity)" strokeWidth={3} />
                 </AreaChart>
               ) : (
                 <BarChart data={chartData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#525252', fontSize: 10}} />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#525252', fontSize: 10}} />
                   <Tooltip 
                     contentStyle={{backgroundColor: '#0a0a0a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff'}}
                     itemStyle={{fontSize: '11px', fontWeight: 'bold'}}
                   />
                   <Bar dataKey="production" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                 </BarChart>
               )}
             </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Dynamic Panel: Mission Ledger or Fleet Monitor */}
        <GlassCard className="flex flex-col border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-black text-white uppercase tracking-tight">
              {role === 'logistics' ? "Strategic Dispatch" : "Mission Ledger"}
            </h4>
            <div className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest">
              {role === 'logistics' ? "Live Unit Sync" : "Live Orders"}
            </div>
          </div>
          
          <div className="space-y-5 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {recentOrders.length > 0 ? recentOrders.map((order) => (
              <div key={order.id} className="group border-b border-white/5 pb-4 last:border-0 hover:bg-white/[0.01] transition-colors rounded-lg">
                <div className="flex items-start justify-between text-left">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                       <p className="text-xs font-black text-white tracking-widest uppercase">{order.id}</p>
                       <span className={cn(
                         "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                         order.region === 'international' ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                       )}>
                         {order.region === 'international' ? "INTL" : "LCL"}
                       </span>
                    </div>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase truncate max-w-[150px] italic">
                      {order.client_name} • {order.assigned_driver?.full_name || "PENDING"}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      "text-[9px] font-black tracking-widest uppercase mb-1",
                      order.status === 'delivered' ? 'text-green-500' : 'text-blue-500'
                    )}>
                      {order.status.replace('_', ' ')}
                    </div>
                    <p className="text-[9px] text-neutral-700 font-mono tracking-tighter">
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="py-20 text-center opacity-20">
                 <Package size={24} className="mx-auto mb-2" />
                 <p className="text-[10px] font-black uppercase tracking-widest">No Recent Intel</p>
              </div>
            )}
          </div>

          <Link href={role === 'logistics' ? "/tracking" : "/orders"} className="mt-6 flex items-center justify-center gap-2 w-full py-3 bg-white/5 rounded-xl text-[10px] font-black text-neutral-400 hover:text-white hover:bg-white/10 transition-all uppercase tracking-[0.2em] border border-white/5">
            {role === 'logistics' ? "Fleet Intelligence" : "Full Inventory"} <ArrowRight size={14} />
          </Link>
        </GlassCard>
      </section>

      {/* Role-Specific Governance/Operations Control Panel */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {role === 'admin' ? (
          <>
            <Link href="/admin/staff" className="p-6 rounded-2xl bg-blue-600/5 border border-blue-500/10 hover:bg-blue-600/10 transition-all group">
              <Users className="text-blue-500 mb-4 group-hover:scale-110 transition-transform" size={24} />
              <h5 className="text-sm font-black text-white uppercase italic">Staff Governance</h5>
              <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mt-1">Manage, promote & remove personnel</p>
            </Link>
            <Link href="/analytics" className="p-6 rounded-2xl bg-purple-600/5 border border-purple-500/10 hover:bg-purple-600/10 transition-all group">
               <BarChart3 className="text-purple-500 mb-4 group-hover:scale-110 transition-transform" size={24} />
               <h5 className="text-sm font-black text-white uppercase italic">Enterprise Intelligence</h5>
               <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mt-1">Strategic growth & ROI analytics</p>
            </Link>
          </>
        ) : (
          <>
            <Link href="/manufacturing" className="p-6 rounded-2xl bg-green-600/5 border border-green-500/10 hover:bg-green-600/10 transition-all group">
              <Factory className="text-green-500 mb-4 group-hover:scale-110 transition-transform" size={24} />
              <h5 className="text-sm font-black text-white uppercase italic">Floor Capacity</h5>
              <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mt-1">Optimize stage-by-stage output</p>
            </Link>
            <Link href="/tracking" className="p-6 rounded-2xl bg-orange-600/5 border border-orange-500/10 hover:bg-orange-600/10 transition-all group">
               <Truck className="text-orange-500 mb-4 group-hover:scale-110 transition-transform" size={24} />
               <h5 className="text-sm font-black text-white uppercase italic">Logistics Dispatch</h5>
               <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mt-1">Assign deliveries & track fleet</p>
            </Link>
          </>
        )}
      </section>
    </div>
  );
}
