// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// src/types/index.ts
export type UserRole = 
  | "admin" 
  | "supervisor" 
  | "logistics" 
  | "inventory";

export interface Profile {
  id: string;
  role: string; // Changed to string for flexibility with dynamic roles
  full_name: string;
  nic_number?: string;
  phone_number?: string;
  avatar_url?: string;
}

export type OrderStatus = "pending" | "in_production" | "delivered" | "cancelled";

export type StageName = 
  | "Design" 
  | "Production 01" 
  | "Print" 
  | "Pasting" 
  | "Production 02" 
  | "Packing" 
  | "Delivery";

export interface ProductionStage {
  id: string;
  order_id: string;
  stage_name: StageName;
  stage_order: number;
  status: "pending" | "in_progress" | "completed" | "failed";
  operator_id?: string;
  started_at?: string;
  completed_at?: string;
}

export interface Order {
  id: string;
  order_number: string;
  client_name: string;
  status: OrderStatus;
  current_stage_index: number;
  created_at: string;
}
