"use client";

import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from "recharts";
import GlassCard from "@/components/ui/GlassCard";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Activity,
  ArrowUpRight,
  Filter,
  ShieldCheck,
  Clock,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export default function AnalyticsPage() {
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    oee: "0.0%",
    quality: "0.0%",
    efficiency: "0.0%",
    downtime: "0.0h"
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7D");
  const [showRangeModal, setShowRangeModal] = useState(false);

  useEffect(() => {
    fetchIntelligence();
  }, [timeRange]);

  const fetchIntelligence = async () => {
    setLoading(true);
    try {
      // 1. Fetch Orders for Tending with Temporal Filtering
      let query = supabase
        .from('orders')
        .select('created_at, status, quality_passed')
        .order('created_at', { ascending: true });

      const now = new Date();
      if (timeRange === '7D') {
        const d = new Date(); d.setDate(d.getDate() - 7);
        query = query.gte('created_at', d.toISOString());
      } else if (timeRange === '30D') {
        const d = new Date(); d.setDate(d.getDate() - 30);
        query = query.gte('created_at', d.toISOString());
      }
      
      const { data: orders } = await query;

      if (orders) {
        // Transform for charts (last 7 days)
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const chartMap = new Map();
        
        // Initialize last 7 days
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          chartMap.set(days[date.getDay()], { name: days[date.getDay()], oee: 0, quality: 0, waste: 0, count: 0 });
        }

        orders.forEach(o => {
          const d = new Date(o.created_at);
          const dayName = days[d.getDay()];
          if (chartMap.has(dayName)) {
            const entry = chartMap.get(dayName);
            entry.count += 1;
            if (o.status === 'delivered') entry.oee += 1;
            if (o.quality_passed) entry.quality += 1;
            else entry.waste += 1;
          }
        });

        const chartData = Array.from(chartMap.values()).map(entry => ({
          ...entry,
          oee: entry.count > 0 ? Math.round((entry.oee / entry.count) * 100) : 0,
          quality: entry.count > 0 ? Math.round((entry.quality / entry.count) * 100) : 0,
          waste: entry.count > 0 ? Math.round((entry.waste / entry.count) * 20) : 0 // Normalized for visual
        }));

        setData(chartData);

        // 2. Global KPIs
        const total = orders.length;
        const delivered = orders.filter(o => o.status === 'delivered').length;
        const quality = orders.filter(o => o.quality_passed).length;

        // 3. Dynamic Downtime Trace
        const { data: downtimeRecs } = await supabase
          .from('downtime_logs')
          .select('duration_minutes');
        
        const totalDowntimeMin = (downtimeRecs || []).reduce((acc, curr) => acc + curr.duration_minutes, 0);
        const efficiencyVal = total > 0 ? (delivered / total) * 105 : 0; // Simplified efficiency delta

        setStats({
          oee: total > 0 ? `${Math.round((delivered / total) * 100)}%` : "0%",
          quality: total > 0 ? `${Math.round((quality / total) * 100)}%` : "0%",
          efficiency: `${Math.min(100, Math.round(efficiencyVal))}%`,
          downtime: `${(totalDowntimeMin / 60).toFixed(1)}h`
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!data.length) return;
    
    const headers = ["Day", "OEE %", "Quality %", "Waste (Normalized)"];
    const csvContent = [
      headers.join(","),
      ...data.map(row => `${row.name},${row.oee},${row.quality},${row.waste}`)
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Operational_Intelligence_Report_${timeRange}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  return (
    <div className="space-y-8 pb-10">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Operational Intelligence</h2>
          <p className="text-neutral-400">Deep-dive into factory performance and efficiency metrics.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <button 
              onClick={() => setShowRangeModal(!showRangeModal)}
              className="btn-secondary !px-4 !py-2 text-xs flex items-center gap-2 border-white/10"
            >
              <Filter size={14} /> {timeRange === '7D' ? 'Last 7 Days' : 'Last 30 Days'}
            </button>
            {showRangeModal && (
              <div className="absolute top-full mt-2 right-0 w-40 bg-neutral-900 border border-white/10 rounded-xl overflow-hidden z-50 shadow-2xl animate-fade-in">
                {['7D', '30D'].map((r) => (
                  <button
                    key={r}
                    onClick={() => { setTimeRange(r); setShowRangeModal(false); }}
                    className={cn(
                      "w-full px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest transition-colors",
                      timeRange === r ? "bg-blue-600 text-white" : "text-neutral-500 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {r === '7D' ? 'Last 7 Days' : 'Last 30 Days'}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button 
            onClick={handleExport}
            className="btn-primary !px-4 !py-2 text-xs border border-white/10 shadow-lg shadow-blue-500/10"
          >
            Export Report
          </button>
        </div>
      </section>

      {/* KPI Cards */}
      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="animate-spin inline text-blue-500 mb-4" size={32} />
          <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">Compiling Tactical Intelligence...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "Overall OEE", value: stats.oee, icon: Activity, color: "text-blue-500" },
            { label: "Quality Rate", value: stats.quality, icon: ShieldCheck, color: "text-green-500" },
            { label: "Labor Efficiency", value: stats.efficiency, icon: Users, color: "text-purple-500" },
            { label: "Downtime", value: stats.downtime, icon: Clock, color: "text-red-500" },
          ].map((kpi, i) => (
            <GlassCard key={i} className="flex flex-col gap-4 group">
              <div className="flex justify-between items-center">
                <div className={`p-2 rounded-lg bg-white/5 border border-white/10 ${kpi.color}`}>
                  <kpi.icon size={20} />
                </div>
                <ArrowUpRight size={16} className="text-neutral-600 group-hover:text-white transition-colors" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-widest font-bold">{kpi.label}</p>
                <h3 className="text-2xl font-bold text-white mt-1">{kpi.value}</h3>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* OEE Trend */}
        <GlassCard className="h-[400px] flex flex-col">
          <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-8">OEE Trend (Weekly)</h4>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorOee" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#737373', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#737373', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#121212', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="oee" stroke="#3b82f6" fillOpacity={1} fill="url(#colorOee)" strokeWidth={3} />
                </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Quality vs Waste */}
        <GlassCard className="h-[400px] flex flex-col">
          <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-8">Quality vs Waste Distribution</h4>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#737373', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#737373', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#121212', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                  <Bar dataKey="quality" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={40} />
                  <Bar dataKey="waste" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

