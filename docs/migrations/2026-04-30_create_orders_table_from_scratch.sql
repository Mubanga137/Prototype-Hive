-- =====================================================================
-- CREATE orders TABLE - Complete Schema for Checkout
-- Run this if the orders table doesn't exist
-- =====================================================================

-- Drop existing table if it exists (CAREFUL - this deletes data!)
-- DROP TABLE IF EXISTS public.orders CASCADE;

-- Create the orders table with all required columns
CREATE TABLE IF NOT EXISTS public.orders (
  -- Primary Key
  id bigserial primary key,
  
  -- Timestamps
  created_at timestamp with time zone default now(),
  
  -- User/Buyer Info
  buyer_id uuid,
  
  -- Vendor/Store Info
  sme_id bigint,
  store_id bigint,
  
  -- Product/Item Info
  item_id bigint,
  offer_id bigint,
  item_type text,
  
  -- Quantities and Pricing
  quantity integer default 1,
  total_amount numeric(12,2),
  total_price numeric(12,2),
  
  -- Customer Contact Information
  customer_name text,
  customer_phone text,
  
  -- Delivery/Service Details
  delivery_address text,
  scheduled_date date,
  service_notes text,
  
  -- Order Status
  status text default 'pending',
  
  -- Verification
  otp_code text,
  
  -- Logistics
  node_id bigint,
  rider_id bigint,
  runner_id bigint,
  
  -- Pricing Breakdown
  hive_skim_amount numeric(12,2),
  system_fee numeric(12,2),
  
  -- Flags
  is_resold_item boolean default false
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_sme_id ON public.orders(sme_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_item_id ON public.orders(item_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON public.orders(customer_name);
CREATE INDEX IF NOT EXISTS idx_orders_otp_code ON public.orders(otp_code);
CREATE INDEX IF NOT EXISTS idx_orders_node_id ON public.orders(node_id);
CREATE INDEX IF NOT EXISTS idx_orders_rider_id ON public.orders(rider_id);

-- Add Foreign Key Constraints (if referenced tables exist)
ALTER TABLE public.orders
  ADD CONSTRAINT orders_item_id_fkey 
  FOREIGN KEY (item_id) REFERENCES public.hive_catalogue(id) 
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_store_id_fkey 
  FOREIGN KEY (store_id) REFERENCES public.sme_stores(id) 
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_sme_id_fkey 
  FOREIGN KEY (sme_id) REFERENCES public.hive_catalogue(id) 
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_offer_id_fkey 
  FOREIGN KEY (offer_id) REFERENCES public.hive_catalogue(id) 
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_node_id_fkey 
  FOREIGN KEY (node_id) REFERENCES public.hive_nodes(id) 
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_rider_id_fkey 
  FOREIGN KEY (rider_id) REFERENCES public.riders(id) 
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_runner_id_fkey 
  FOREIGN KEY (runner_id) REFERENCES public.runners(id) 
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Enable Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- RLS Policy 1: Anyone can insert (create orders)
DROP POLICY IF EXISTS "anyone can place an order" ON public.orders;
CREATE POLICY "anyone can place an order"
ON public.orders FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- RLS Policy 2: Buyers can read their own orders
DROP POLICY IF EXISTS "buyer can read own orders" ON public.orders;
CREATE POLICY "buyer can read own orders"
ON public.orders FOR SELECT
TO authenticated
USING (buyer_id = auth.uid());

-- RLS Policy 3: SME owners can read store orders
DROP POLICY IF EXISTS "sme owner can read store orders" ON public.orders;
CREATE POLICY "sme owner can read store orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sme_stores s
    WHERE s.id = orders.store_id
      AND s.owner_user_id = auth.uid()
  )
);

-- RLS Policy 4: SME owners can update store orders
DROP POLICY IF EXISTS "sme owner can update store orders" ON public.orders;
CREATE POLICY "sme owner can update store orders"
ON public.orders FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sme_stores s
    WHERE s.id = orders.store_id
      AND s.owner_user_id = auth.uid()
  )
);

-- RLS Policy 5: Anon users can read orders (for guest checkout tracking - optional)
DROP POLICY IF EXISTS "guest can read order by otp" ON public.orders;
CREATE POLICY "guest can read order by otp"
ON public.orders FOR SELECT
TO anon, authenticated
USING (otp_code IS NOT NULL);

-- Refresh schema cache
ANALYZE public.orders;

-- Verification Query (uncomment to verify)
/*
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;
*/
