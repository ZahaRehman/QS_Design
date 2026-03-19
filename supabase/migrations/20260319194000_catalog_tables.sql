create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'USD',
  is_active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_categories (
  product_id uuid not null references public.products (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, category_id)
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  image_url text not null,
  cloudinary_public_id text,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_categories_category_id
  on public.product_categories (category_id);
create index if not exists idx_product_images_product_id
  on public.product_images (product_id);

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_categories enable row level security;
alter table public.product_images enable row level security;

drop policy if exists categories_read_active on public.categories;
create policy categories_read_active
on public.categories
for select
to authenticated
using (is_active = true);

drop policy if exists products_read_active on public.products;
create policy products_read_active
on public.products
for select
to authenticated
using (is_active = true);

drop policy if exists product_categories_read_authenticated on public.product_categories;
create policy product_categories_read_authenticated
on public.product_categories
for select
to authenticated
using (true);

drop policy if exists product_images_read_authenticated on public.product_images;
create policy product_images_read_authenticated
on public.product_images
for select
to authenticated
using (true);

grant select, insert, update, delete on table public.categories to service_role;
grant select, insert, update, delete on table public.products to service_role;
grant select, insert, update, delete on table public.product_categories to service_role;
grant select, insert, update, delete on table public.product_images to service_role;
