-- Add product_data column to messages table if it doesn't exist
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS product_data JSONB DEFAULT NULL;

-- Add context_item_id to conversations if it doesn't exist
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS context_item_id INTEGER DEFAULT NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS messages_product_data_idx ON public.messages USING BTREE (product_data);
CREATE INDEX IF NOT EXISTS conversations_context_item_id_idx ON public.conversations(context_item_id);

-- Ensure guest_tracking_token is indexed
CREATE INDEX IF NOT EXISTS conversations_guest_tracking_token_idx ON public.conversations(guest_tracking_token);
