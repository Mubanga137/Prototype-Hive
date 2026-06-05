-- =====================================================================
-- ENFORCE MESSAGING INVARIANTS
-- Adds orders.conversation_id column and strict conversation lifecycle
-- =====================================================================

-- 1. Add conversation_id column to orders
-- This persists the single conversation per order (Invariant #1)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS conversation_id UUID
REFERENCES public.conversations(id) ON DELETE SET NULL;

-- Create index for fast conversation lookup
CREATE INDEX IF NOT EXISTS idx_orders_conversation_id 
ON public.orders(conversation_id);

-- 2. Backfill existing orders with their conversation_id
-- Maps orders to existing conversations via context_order_id
UPDATE public.orders o
SET conversation_id = c.id
FROM public.conversations c
WHERE c.context_order_id = o.id
  AND o.conversation_id IS NULL;

-- 3. Add database constraints to enforce invariants
-- Prevent multiple conversations per order
ALTER TABLE public.conversations
ADD CONSTRAINT unique_conversation_per_order 
UNIQUE (context_order_id) 
DEFERRABLE INITIALLY DEFERRED;

-- 4. Add NOT NULL constraint to conversation_id in messages
-- (Invariant #3: every message must have a valid conversation_id)
-- WARNING: If there are orphaned messages, this will fail.
-- Verify first: SELECT COUNT(*) FROM messages WHERE conversation_id IS NULL
ALTER TABLE public.messages
ALTER COLUMN conversation_id SET NOT NULL;

-- 5. Create a function to enforce strict conversation creation
-- This prevents creating a new conversation if one already exists for an order
CREATE OR REPLACE FUNCTION prevent_duplicate_order_conversation()
RETURNS TRIGGER AS $$
BEGIN
  -- If this conversation has a context_order_id, check for duplicates
  IF NEW.context_order_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.conversations
      WHERE context_order_id = NEW.context_order_id
        AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'A conversation already exists for order %', NEW.context_order_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_order_conversation ON public.conversations;
CREATE TRIGGER trg_prevent_duplicate_order_conversation
BEFORE INSERT OR UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION prevent_duplicate_order_conversation();

-- 6. Create a function to log message inserts (Invariant #7: debug logging)
CREATE OR REPLACE FUNCTION log_message_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Verify conversation exists
  IF NOT EXISTS (SELECT 1 FROM public.conversations WHERE id = NEW.conversation_id) THEN
    RAISE EXCEPTION 'Message insert rejected: conversation_id % does not exist', NEW.conversation_id;
  END IF;
  
  -- Log the insert (to be observed in server logs or a logging table)
  -- For now, this is enforced as a check; add logging table if needed
  RAISE LOG 'Message inserted: id=%, conversation_id=%, sender_id=%, message_type=%',
    NEW.id, NEW.conversation_id, NEW.sender_id, NEW.message_type;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_message_insert ON public.messages;
CREATE TRIGGER trg_log_message_insert
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION log_message_insert();

-- 7. Verify messaging integrity
-- Run this to check for orphaned/inconsistent state
/*
SELECT 
  'Orphaned messages (conversation_id does not exist)' AS issue,
  COUNT(*) AS count
FROM public.messages m
WHERE NOT EXISTS (SELECT 1 FROM public.conversations WHERE id = m.conversation_id);

SELECT 
  'Orders without conversation_id' AS issue,
  COUNT(*) AS count
FROM public.orders
WHERE conversation_id IS NULL;

SELECT 
  'Conversations without orders' AS issue,
  COUNT(*) AS count
FROM public.conversations c
WHERE context_order_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.orders WHERE id = c.context_order_id);
*/

-- Refresh schema cache
ANALYZE public.orders;
ANALYZE public.conversations;
ANALYZE public.messages;
