CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'logistics', 'inventory', 'driver', 'operator', 'inspector');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    email TEXT,
    nic_number TEXT UNIQUE,
    phone_number TEXT,
    role TEXT DEFAULT 'logistics',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    item_specification TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    region TEXT DEFAULT 'local' CHECK (region IN ('local', 'international')),
    destination_country TEXT DEFAULT 'Sri Lanka',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_production', 'in_transit', 'completed', 'delivered')),
    production_stage INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    assigned_driver_id UUID REFERENCES public.profiles(id),
    scheduled_start_at TIMESTAMP WITH TIME ZONE,
    contact_number TEXT,
    pod_image_url TEXT,
    delivered_at TIMESTAMP WITH TIME ZONE,
    total_price NUMERIC DEFAULT 0,
    quality_passed BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.production_stages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
    stage_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    operator_id UUID REFERENCES public.profiles(id),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.vehicles (
    id TEXT PRIMARY KEY,
    vehicle_type TEXT,
    model TEXT,
    driver_id UUID REFERENCES public.profiles(id) UNIQUE,
    status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'in_transit', 'maintenance', 'available', 'on_delivery')),
    is_mission_active BOOLEAN DEFAULT false,
    current_order_id TEXT REFERENCES public.orders(id),
    last_latitude DOUBLE PRECISION,
    last_longitude DOUBLE PRECISION,
    current_lat DOUBLE PRECISION,
    current_lng DOUBLE PRECISION,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.gps_logs (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed DOUBLE PRECISION,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.deliveries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id TEXT REFERENCES public.orders(id),
    vehicle_id TEXT REFERENCES public.vehicles(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'picked_up', 'in_transit', 'delivered', 'failed')),
    signature_url TEXT,
    photo_url TEXT,
    pod_signature TEXT,
    delivered_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    recipient_name TEXT
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('info', 'success', 'warning', 'error')) DEFAULT 'info',
    read BOOLEAN DEFAULT false,
    action_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.password_reset_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID,
    full_name TEXT,
    email TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Raw Material', 'Finished Good', 'Packaging')),
    quantity INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'units',
    unit_price NUMERIC DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.inventory_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    change_amount INTEGER NOT NULL,
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    actor_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.downtime_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    station_id TEXT NOT NULL,
    reason TEXT,
    duration_minutes INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE OR REPLACE FUNCTION update_vehicle_location()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.vehicles 
    SET last_latitude = NEW.latitude, 
        last_longitude = NEW.longitude,
        current_lat = NEW.latitude,
        current_lng = NEW.longitude,
        last_updated = NEW.timestamp
    WHERE id = NEW.vehicle_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_gps_log_added ON public.gps_logs;
CREATE TRIGGER on_gps_log_added
AFTER INSERT ON public.gps_logs
FOR EACH ROW EXECUTE FUNCTION update_vehicle_location();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'logistics');

  BEGIN
    INSERT INTO public.profiles (id, full_name, email, role, nic_number, phone_number)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Enterprise User'),
      NEW.email,
      v_role,
      COALESCE(NEW.raw_user_meta_data->>'nic_number', NEW.raw_user_meta_data->>'nic'),
      COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.raw_user_meta_data->>'phone')
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      role = EXCLUDED.role,
      nic_number = COALESCE(EXCLUDED.nic_number, profiles.nic_number),
      phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number);
  EXCEPTION 
    WHEN unique_violation THEN
      IF (sqlerrm LIKE '%nic_number%') THEN
        RAISE EXCEPTION 'IDENTITY_CONFLICT: NIC Number is already registered.';
      END IF;
      RAISE EXCEPTION 'IDENTITY_CONFLICT: A profile with these unique details already exists.';
  END;

  IF (v_role = 'driver' AND NEW.raw_user_meta_data->>'vehicle_number' IS NOT NULL) THEN
    BEGIN
      INSERT INTO public.vehicles (id, vehicle_type, driver_id, status)
      VALUES (
        UPPER(NEW.raw_user_meta_data->>'vehicle_number'),
        COALESCE(NEW.raw_user_meta_data->>'vehicle_type', 'Standard'),
        NEW.id,
        'idle'
      )
      ON CONFLICT (id) DO UPDATE SET
        driver_id = EXCLUDED.driver_id,
        vehicle_type = EXCLUDED.vehicle_type;
    EXCEPTION 
      WHEN unique_violation THEN
        RAISE EXCEPTION 'VEHICLE_CONFLICT: This License Plate is already assigned to a driver.';
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE OR REPLACE FUNCTION log_inventory_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.quantity IS DISTINCT FROM NEW.quantity) THEN
        INSERT INTO public.inventory_logs (item_id, change_amount, previous_quantity, new_quantity, actor_id)
        VALUES (NEW.id, NEW.quantity - OLD.quantity, OLD.quantity, NEW.quantity, auth.uid());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_inventory_update ON public.inventory_items;
CREATE TRIGGER on_inventory_update
AFTER UPDATE ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION log_inventory_change();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.downtime_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
    END LOOP;
END $$;

CREATE POLICY "Public & Auth profiles viewable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert/update own profile" ON public.profiles FOR ALL USING (auth.uid() = id OR true);

CREATE POLICY "Orders viewable by all" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Authenticated users manage orders" ON public.orders FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Production stages viewable by all" ON public.production_stages FOR SELECT USING (true);
CREATE POLICY "Authenticated users manage production stages" ON public.production_stages FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Vehicles viewable by all" ON public.vehicles FOR SELECT USING (true);
CREATE POLICY "Authenticated users manage vehicles" ON public.vehicles FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "GPS logs viewable by all" ON public.gps_logs FOR SELECT USING (true);
CREATE POLICY "Drivers and system insert gps logs" ON public.gps_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Deliveries viewable by all" ON public.deliveries FOR SELECT USING (true);
CREATE POLICY "Authenticated users manage deliveries" ON public.deliveries FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Notifications read own" ON public.notifications FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Notifications update own" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Notifications insert all" ON public.notifications FOR INSERT WITH CHECK (true);

CREATE POLICY "Password reset insert all" ON public.password_reset_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Password reset view authenticated" ON public.password_reset_requests FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Password reset manage authenticated" ON public.password_reset_requests FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Inventory view all" ON public.inventory_items FOR SELECT USING (true);
CREATE POLICY "Inventory manage authenticated" ON public.inventory_items FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Inventory logs view all" ON public.inventory_logs FOR SELECT USING (true);
CREATE POLICY "Inventory logs insert system" ON public.inventory_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Downtime logs view all" ON public.downtime_logs FOR SELECT USING (true);
CREATE POLICY "Downtime logs insert system" ON public.downtime_logs FOR INSERT WITH CHECK (true);

BEGIN;
  DO $$ 
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      CREATE PUBLICATION supabase_realtime;
    END IF;
  END $$;
COMMIT;

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.downtime_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.password_reset_requests;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('deliveries', 'deliveries', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Access for deliveries bucket" ON storage.objects;
CREATE POLICY "Public Access for deliveries bucket" ON storage.objects
FOR SELECT USING (bucket_id = 'deliveries');

DROP POLICY IF EXISTS "Public Uploads for deliveries bucket" ON storage.objects;
CREATE POLICY "Public Uploads for deliveries bucket" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'deliveries');

INSERT INTO public.inventory_items (name, category, quantity, unit, unit_price, reorder_level)
VALUES 
    ('Matte Label Paper', 'Raw Material', 500, 'sheets', 12.50, 100),
    ('Industrial Adhesive', 'Raw Material', 45, 'kg', 45.00, 10),
    ('Corrugated Boxes', 'Packaging', 200, 'units', 8.00, 50)
ON CONFLICT DO NOTHING;

INSERT INTO public.orders (id, client_name, item_specification, quantity, priority, region, destination_country, status, production_stage, total_price)
VALUES 
    ('ORD-INT-2026-001', 'Apex Global Logistics', 'Heavy Duty Industrial Wraps', 1200, 'critical', 'international', 'Germany', 'in_production', 3, 14500.00),
    ('ORD-LCL-2026-002', 'Lanka Retail Corp', 'Eco Packaging Sleeves', 500, 'medium', 'local', 'Sri Lanka', 'pending', 1, 3200.00),
    ('ORD-LCL-2026-003', 'Ceylon Pharmaceuticals', 'Sterile Medical Vials Container', 2500, 'high', 'local', 'Sri Lanka', 'in_transit', 6, 28900.00)
ON CONFLICT DO NOTHING;
