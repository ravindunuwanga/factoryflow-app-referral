"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Bell, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Clock, 
  MoreVertical,
  Trash2,
  Check,
  Loader2
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

import { supabase } from "@/lib/supabase";

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  action_url?: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();

    // REAL-TIME ALERT SYNC
    const channel = supabase
      .channel('notif-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => fetchNotifications()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Notification sync failure:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id);
    
    fetchNotifications();
  };

  const clearAll = async () => {
    if (!confirm("Are you sure you want to purge the entire operational log?")) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id);
    
    fetchNotifications();
  };

  const dismiss = async (id: string) => {
    await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
    
    fetchNotifications();
  };

  const takeAction = (path: string) => {
    router.push(path);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2 uppercase tracking-widest">Notifications Center</h2>
          <p className="text-neutral-500 font-bold text-xs uppercase tracking-widest">Stay informed about critical production and logistics events.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={markAllRead}
            className="btn-secondary flex items-center gap-2 !py-2 !px-4 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
          >
            <Check size={14} /> Mark All as Read
          </button>
          <button 
            onClick={clearAll}
            className="btn-secondary !py-2 !px-4 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all border-red-500/10"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </section>

      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="animate-spin inline text-blue-500 mb-4" size={32} />
            <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">Retrieving Operational Log...</p>
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((notif) => (
            <GlassCard 
              key={notif.id} 
              className={cn(
                "flex items-start gap-6 group hover:border-white/20 transition-all relative overflow-hidden",
                !notif.read && "bg-white/[0.04] border-white/10"
              )}
            >
              {!notif.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />}
              
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-lg",
                notif.type === 'success' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                notif.type === 'warning' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                notif.type === 'error' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                "bg-blue-500/10 text-blue-500 border-blue-500/20"
              )}>
                {notif.type === 'success' && <CheckCircle2 size={24} />}
                {notif.type === 'warning' && <AlertCircle size={24} />}
                {notif.type === 'error' && <AlertCircle size={24} />}
                {notif.type === 'info' && <Info size={24} />}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-start">
                  <h4 className={cn(
                    "text-lg font-bold tracking-tight transition-colors uppercase",
                    notif.read ? "text-neutral-500" : "text-white"
                  )}>
                    {notif.title}
                  </h4>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-neutral-600 font-bold flex items-center gap-1 uppercase tracking-tighter">
                      <Clock size={12} /> {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button className="text-neutral-700 hover:text-white transition-colors">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </div>
                <p className={cn(
                  "text-sm leading-relaxed font-medium",
                  notif.read ? "text-neutral-600" : "text-neutral-400"
                )}>
                  {notif.message}
                </p>
                
                <div className="pt-4 flex gap-2">
                  {notif.action_url && (
                    <button 
                      onClick={() => takeAction(notif.action_url!)}
                      className="text-[10px] font-black uppercase tracking-widest text-white px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-all"
                    >
                      Take Action
                    </button>
                  )}
                  <button 
                    onClick={() => dismiss(notif.id)}
                    className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-neutral-300 transition-colors px-4 py-2 hover:bg-white/5 rounded-lg"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </GlassCard>
          ))
        ) : (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10 text-neutral-700">
              <Bell size={24} />
            </div>
            <p className="text-neutral-500 font-bold uppercase tracking-widest text-sm">No new alerts</p>
          </div>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="pt-6 text-center">
          <button className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-600 hover:text-neutral-400 transition-colors border-b border-neutral-800 pb-1">
            End of Operational Log
          </button>
        </div>
      )}
    </div>
  );
}
