-- Per-product canvas sizes (JSON array of { id, label, price_cents })
alter table public.products
  add column if not exists canvas_sizes jsonb not null default '[]'::jsonb;

-- Snapshot of chosen size on each order line
alter table public.order_items
  add column if not exists canvas_size_id text,
  add column if not exists canvas_size_label text;
