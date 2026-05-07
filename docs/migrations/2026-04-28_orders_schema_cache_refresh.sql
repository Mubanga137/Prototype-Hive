-- Refresh Supabase schema cache for the orders table
-- This ensures the new columns (customer_name, customer_phone, delivery_address, etc.)
-- added in migration 2026-04-17_orders_checkout_fields.sql are recognized

-- Analyze the table to refresh cache
ANALYZE public.orders;
