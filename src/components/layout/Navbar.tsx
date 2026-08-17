"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Search, Menu, Home } from "lucide-react";
import { UserRole, cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

export default function Navbar({ role = "admin" }: { role?: UserRole }) {
  const [userName, setUserName] = useState("Authenticated User");
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || "User");
        
        // Fetch real notifications
        const { data: notes } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3);
        
        setNotifications(notes || []);
      }
    };
    fetchUser();
  }, []);

  return (
    <header className="h-20 bg-background/50 border-b border-[rgba(255,255,255,0.08)] backdrop-blur-md sticky top-0 z-40 px-8 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <button className="lg:hidden text-neutral-400">
          <Menu size={20} />
        </button>
        
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
          <input 
            type="text" 
            placeholder="Search orders, vehicles..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-full pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20 w-80 transition-all font-medium"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Explicit Go Home Button */}
        <Link 
          href="/" 
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/5 hover:bg-white/5 text-neutral-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
        >
          <Home size={14} /> Exit to Site
        </Link>

        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 rounded-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-neutral-400 hover:text-white transition-all relative group"
          >
            <Bell size={20} />
            <span className={cn(
              "absolute top-2 right-2 w-2 h-2 rounded-full border-2 border-background",
              notifications.some(n => !n.read) ? "bg-red-500" : "bg-blue-500"
            )} />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-4 w-80 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl p-4 overflow-hidden animate-fade-in z-50">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-white uppercase tracking-widest">Recent Activity</h4>
                <Link href="/notifications" className="text-[10px] text-blue-500 hover:text-blue-400 font-bold" onClick={() => setShowNotifications(false)}>View All</Link>
              </div>
              <div className="space-y-3">
                {notifications.length > 0 ? notifications.map((note) => (
                  <div key={note.id} className="p-3 bg-white/5 rounded-xl border border-white/5 flex flex-col gap-1">
                    <p className="text-xs text-white font-medium">{note.title}</p>
                    <p className="text-[9px] text-neutral-400 line-clamp-1 italic">{note.message}</p>
                    <p className="text-[8px] text-neutral-600 mt-1 uppercase font-bold tracking-tighter">
                      {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                )) : (
                  <p className="text-[10px] text-neutral-500 p-4 text-center">No recent activity detected.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pl-4 border-l border-[rgba(255,255,255,0.1)]">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-white tracking-tight">{userName}</p>
            <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">{role}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neutral-800 to-black border border-white/10 flex items-center justify-center text-white font-bold text-xs ring-1 ring-white/5 shadow-xl">
            {userName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
