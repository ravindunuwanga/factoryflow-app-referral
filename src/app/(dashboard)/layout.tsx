"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import { supabase } from "@/lib/supabase";
import { UserRole } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>("admin");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.replace("/login");
        return;
      }

      // Fetch user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      if (profile) {
        setRole(String(profile.role) as UserRole);
        guardRoute(String(profile.role) as UserRole);
      } else {
        // Fallback to metadata if profile row doesn't exist yet
        const metaRole = session.user.user_metadata?.role;
        if (metaRole) {
          const sanitizedMeta = typeof metaRole === 'string' ? metaRole : (metaRole?.role || 'operator');
          setRole(sanitizedMeta as UserRole);
          guardRoute(sanitizedMeta as UserRole);
        }
      }
      
      setLoading(false);
    };

    const guardRoute = (userRole: UserRole) => {
      // 1. Explicitly Block Unauthorized Roles from this HUB
      const forbidden = ['driver', 'operator', 'inspector'];
      if (forbidden.includes(userRole as any)) {
        supabase.auth.signOut().then(() => {
          router.replace('/login');
        });
        return;
      }

      const path = window.location.pathname;
      if (path.startsWith('/admin') && userRole !== 'admin') {
        router.replace('/dashboard');
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar - Desktop */}
      <div className="hidden lg:block w-64 flex-shrink-0">
        <Sidebar role={role} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar role={role} />
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
