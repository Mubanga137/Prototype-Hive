-- =====================================================================
-- EMERGENCY FIX: Add INSERT policy for anon users
-- This enables guest checkout without requiring login
-- =====================================================================

-- First, drop any conflicting INSERT policies
DROP POLICY IF EXISTS "anyone_can_place_order" ON public.orders;
DROP POLICY IF EXISTS "anyone can place an order" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON public.orders;

-- Create the ONLY INSERT policy needed: Allow anon + authenticated to insert
CREATE POLICY "anyone_can_place_order"
ON public.orders FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Verify it exists
SELECT policyname FROM pg_policies 
WHERE tablename = 'orders' AND policyname = 'anyone_can_place_order';
