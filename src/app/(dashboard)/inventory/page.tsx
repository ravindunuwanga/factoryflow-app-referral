"use client";

import { useState, useEffect } from "react";
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  History, 
  AlertTriangle, 
  ArrowUpRight,
  Loader2,
  MoreVertical,
  Minus,
  Edit2,
  ShieldCheck
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemForm, setNewItemForm] = useState({
    name: '',
    category: 'Raw Material',
    quantity: 0,
    unit: 'units',
    unit_price: 0,
    reorder_level: 10
  });
  const [totalValue, setTotalValue] = useState(0);
  const [movements24h, setMovements24h] = useState(0);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchInventory();
    
    // Establishing real-time link
    const channel = supabase
      .channel('inventory-pulse')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'inventory_items' 
      }, () => {
        fetchInventory();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setErrorStatus(null);
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('[INVENTORY] Fetch Error:', error);
        setErrorStatus(error.message);
        return;
      }
      setItems(data || []);
      
      // Calculate Total Value
      const val = (data || []).reduce((acc, item) => acc + (item.quantity * (item.unit_price || 0)), 0);
      setTotalValue(val);

      // Fetch 24h Movements
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);
      const { count } = await supabase
        .from('inventory_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString());
      
      setMovements24h(count || 0);
    } catch (err: any) {
      setErrorStatus(err.message || "Unknown Connection Failure");
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustStock = async (id: string, current: number, delta: number) => {
    const next = Math.max(0, current + delta);
    const { error } = await supabase
      .from('inventory_items')
      .update({ quantity: next, last_updated: new Date().toISOString() })
      .eq('id', id);
    
    if (error) {
      console.error('[INVENTORY] Adjustment Error:', error);
      alert("Adjustment Jam: " + (error.message || "Unknown Failure"));
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemForm.name) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('inventory_items')
        .insert([{
          ...newItemForm,
          last_updated: new Date().toISOString()
        }]);

      if (error) throw error;
      
      setShowAddModal(false);
      setNewItemForm({
        name: '',
        category: 'Raw Material',
        quantity: 0,
        unit: 'units',
        unit_price: 0,
        reorder_level: 10
      });
      fetchInventory();
    } catch (err: any) {
      alert("Deployment Failure: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

    return (
      <>
        <div className="space-y-8 pb-10">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2 uppercase tracking-tighter">Inventory Ledger</h2>
          <p className="text-neutral-400 font-medium italic uppercase tracking-widest text-[10px]">Strategic Stock Integrity & Command</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-primary !px-6 !py-3 flex items-center gap-2 shadow-2xl shadow-blue-500/20"
        >
          <Plus size={18} /> Add Strategic Stock
        </button>
      </section>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Total Asset Value", value: `Rs. ${(totalValue / 1000).toFixed(1)}K`, icon: Package, color: "text-blue-500" },
          { label: "Critical Stock Alerts", value: items.filter(i => i.quantity <= i.reorder_level).length.toString(), icon: AlertTriangle, color: "text-red-500" },
          { label: "Goods Movements (24h)", value: `${movements24h} Units`, icon: History, color: "text-green-500" },
        ].map((kpi, i) => (
          <GlassCard key={i} className="flex flex-col gap-4">
            <div className={`p-2 w-fit rounded-lg bg-white/5 border border-white/10 ${kpi.color}`}>
              <kpi.icon size={20} />
            </div>
            <div>
              <p className="text-[10px] text-neutral-500 font-black uppercase tracking-[0.2em]">{kpi.label}</p>
              <h3 className="text-2xl font-black text-white mt-1 italic tracking-tighter uppercase">{kpi.value}</h3>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="!p-0 overflow-hidden border-white/5 bg-black/40">
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div className="flex items-center gap-4 flex-1">
             <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={16} />
                <input 
                  type="text" 
                  placeholder="Search Ledger..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             <div className="flex gap-2">
                {["All", "Raw Material", "Finished Good", "Packaging"].map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
                      selectedCategory === cat ? "bg-white text-black" : "bg-white/5 text-neutral-500 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {cat}
                  </button>
                ))}
             </div>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-4 text-left text-[9px] font-black text-neutral-500 uppercase tracking-widest">Asset Name</th>
                <th className="px-6 py-4 text-left text-[9px] font-black text-neutral-500 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-left text-[9px] font-black text-neutral-500 uppercase tracking-widest">Stock Level</th>
                <th className="px-6 py-4 text-left text-[9px] font-black text-neutral-500 uppercase tracking-widest">Tactical Status</th>
                <th className="px-6 py-4 text-right text-[9px] font-black text-neutral-500 uppercase tracking-widest">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                   <td colSpan={5} className="px-6 py-20 text-center">
                      <Loader2 className="animate-spin text-blue-500 mx-auto mb-4" size={32} />
                      <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-[0.2em]">Synchronizing Strategic Assets...</p>
                   </td>
                </tr>
              ) : errorStatus ? (
                <tr>
                   <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                         <AlertTriangle size={24} />
                      </div>
                      <p className="text-sm font-black text-white uppercase italic tracking-tighter">Database Provisioning Required</p>
                      <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-2">
                        {errorStatus.includes("relation") ? "Inventory table missing in mission database." : errorStatus}
                      </p>
                      <div className="mt-6 flex justify-center">
                         <button 
                           onClick={() => fetchInventory()}
                           className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[8px] font-black uppercase text-neutral-400 hover:text-white hover:bg-white/10 transition-all tracking-[0.2em]"
                         >
                           Re-Establish Link
                         </button>
                      </div>
                   </td>
                </tr>
              ) : filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-white uppercase tracking-tight italic">{item.name}</p>
                    <p className="text-[10px] text-neutral-600 font-bold mt-1">LAST SYNC: {new Date(item.last_updated).toLocaleTimeString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-neutral-400 font-black uppercase tracking-widest">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                       <span className={cn(
                         "text-xl font-black italic tracking-tighter",
                         item.quantity <= item.reorder_level ? "text-red-500" : "text-white"
                       )}>
                         {item.quantity}
                       </span>
                       <span className="text-[10px] text-neutral-500 uppercase font-black">{item.unit}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     {item.quantity <= item.reorder_level ? (
                        <div className="flex items-center gap-2 text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded w-fit">
                           <AlertTriangle size={10} />
                           <span className="text-[8px] font-black uppercase tracking-widest">CRITICAL LOW</span>
                        </div>
                     ) : (
                        <div className="flex items-center gap-2 text-green-500 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded w-fit">
                           <ShieldCheck size={10} />
                           <span className="text-[8px] font-black uppercase tracking-widest">STABLE</span>
                        </div>
                     )}
                  </td>
                  <td className="px-6 py-4 text-right">
                     <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleAdjustStock(item.id, item.quantity, 1)}
                          className="p-1.5 rounded-lg bg-blue-500/20 text-blue-500 border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all shadow-lg shadow-blue-500/10"
                        >
                          <Plus size={14} />
                        </button>
                        <button 
                          onClick={() => handleAdjustStock(item.id, item.quantity, -1)}
                          className="p-1.5 rounded-lg bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-600 hover:text-white transition-all shadow-lg shadow-red-500/10"
                        >
                          <Minus size={14} />
                        </button>
                        <button className="p-1.5 rounded-lg bg-white/5 text-neutral-400 border border-white/10 hover:text-white transition-all">
                          <MoreVertical size={14} />
                        </button>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>

    {/* STRATEGIC STOCK INTAKE MODAL */}
    {showAddModal && (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowAddModal(false)} />
        <GlassCard className="relative w-full max-w-md !p-8 animate-in zoom-in-95 duration-200 border-white/10 shadow-3xl">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-2xl font-black text-white tracking-tighter italic uppercase">Provision Asset</h3>
              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1">Initialize Stock Ledger for new Payload</p>
            </div>
            <button onClick={() => setShowAddModal(false)} className="text-neutral-500 hover:text-white transition-colors">
              <Plus size={24} className="rotate-45" />
            </button>
          </div>

          <form onSubmit={handleAddItem} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Asset Nomenclature</label>
              <input 
                type="text" 
                required
                placeholder="e.g. High-Gloss Finish Paper"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-sm text-white focus:outline-none focus:border-blue-500/50 uppercase font-black tracking-widest"
                value={newItemForm.name}
                onChange={e => setNewItemForm({...newItemForm, name: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Category Hub</label>
                <select 
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none font-bold uppercase"
                  value={newItemForm.category}
                  onChange={e => setNewItemForm({...newItemForm, category: e.target.value})}
                >
                  <option value="Raw Material">Raw Material</option>
                  <option value="Finished Good">Finished Good</option>
                  <option value="Packaging">Packaging</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Unit Valuation (Rs)</label>
                <input 
                  type="number" 
                  placeholder="e.g. 150"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-sm text-white focus:outline-none focus:border-blue-500/50 font-bold uppercase"
                  value={newItemForm.unit_price}
                  onChange={e => setNewItemForm({...newItemForm, unit_price: parseFloat(e.target.value)})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Initial Payload</label>
                <input 
                  type="number" 
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-sm text-white focus:outline-none focus:border-blue-500/50 font-black"
                  value={newItemForm.quantity}
                  onChange={e => setNewItemForm({...newItemForm, quantity: parseInt(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Red Alert Level</label>
                <input 
                  type="number" 
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-sm text-white focus:outline-none focus:border-blue-500/50 font-black"
                  value={newItemForm.reorder_level}
                  onChange={e => setNewItemForm({...newItemForm, reorder_level: parseInt(e.target.value)})}
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-[11px] font-black text-white uppercase tracking-[0.2em] mt-4 transition-all shadow-[0_20px_40px_-10px_rgba(59,130,246,0.3)] flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : "Authorize Asset Provision"}
            </button>
          </form>
        </GlassCard>
      </div>
    )}
  </>
);
}
