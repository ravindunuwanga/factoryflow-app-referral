"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Factory, 
  Truck, 
  ClipboardList, 
  BarChart3, 
  Bell, 
  LogOut,
  ChevronRight,
  Users,
  ShieldCheck,
  Package
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", roles: ["admin", "supervisor", "logistics", "inventory"] },
  { icon: Users, label: "Staff Management", href: "/admin/staff", roles: ["admin"] },
  { icon: ClipboardList, label: "Orders", href: "/orders", roles: ["admin", "supervisor", "logistics", "inventory"] },
  { icon: Package, label: "Inventory Stock", href: "/inventory", roles: ["admin", "inventory"] },
  { icon: Truck, label: "Fleet Tracking", href: "/tracking", roles: ["admin", "supervisor", "logistics"] },
  { icon: BarChart3, label: "Analytics", href: "/analytics", roles: ["admin"] },
  { icon: Bell, label: "Notifications", href: "/notifications", roles: ["admin", "supervisor", "logistics", "inventory"] },
];

export default function Sidebar({ role = "admin" }: { role?: UserRole }) {
  const pathname = usePathname();
  const router = useRouter();

  const filteredItems = NAV_ITEMS.filter(item => item.roles.includes(role));

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-background border-r border-[rgba(255,255,255,0.08)] flex flex-col z-50">
      <div className="p-8">
        <Link href="/" className="group flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black font-black italic text-sm group-hover:scale-110 transition-transform">FF</div>
          <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-neutral-500 bg-clip-text text-transparent italic uppercase">
            FactoryFlow
          </h1>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href;
          
          // Role-Based Personalization Logic
          let displayLabel = item.label;
          let DisplayIcon = item.icon;

          if (role === 'logistics') {
            if (item.label === 'Orders') {
              displayLabel = "Strategic Dispatch";
              DisplayIcon = ShieldCheck;
            }
            if (item.label === 'Fleet Tracking') {
              displayLabel = "Fleet Units";
            }
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group",
                isActive 
                  ? "bg-[rgba(255,255,255,0.05)] text-white border border-[rgba(255,255,255,0.1)] shadow-[0_0_20px_rgba(255,255,255,0.02)]" 
                  : "text-neutral-400 hover:text-white hover:bg-[rgba(255,255,255,0.02)]"
              )}
            >
              <div className="flex items-center gap-3">
                <DisplayIcon size={20} className={cn("transition-colors", isActive ? "text-white" : "text-neutral-500 group-hover:text-neutral-300")} />
                <span className="font-medium text-sm">{displayLabel}</span>
              </div>
              {isActive && <ChevronRight size={14} className="text-neutral-500" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[rgba(255,255,255,0.08)]">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full text-neutral-400 hover:text-red-400 transition-colors rounded-xl hover:bg-red-500/5 group"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium text-sm">Logout Session</span>
        </button>
      </div>
    </aside>
  );
}
