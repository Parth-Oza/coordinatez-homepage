create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  customer_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  slug text primary key,
  name text not null,
  category text not null check (category in ('Matcha','Vessels','Tools')),
  price numeric(10,2) not null check (price >= 0),
  original_price numeric(10,2),
  image text not null,
  origin text not null,
  summary text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_slug text not null references public.products(slug) on delete cascade,
  quantity integer not null default 1 check (quantity between 1 and 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, product_slug)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('CZ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  user_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  email text not null,
  first_name text not null,
  last_name text not null,
  address text not null,
  city text not null,
  postal_code text not null,
  delivery_method text not null default 'ship' check (delivery_method in ('ship','pickup')),
  subtotal numeric(10,2) not null check (subtotal >= 0),
  shipping numeric(10,2) not null default 0 check (shipping >= 0),
  total numeric(10,2) not null check (total >= 0),
  status text not null default 'received' check (status in ('received','preparing','ready','fulfilled','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_slug text references public.products(slug) on delete set null,
  name_snapshot text not null,
  unit_price numeric(10,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 99),
  created_at timestamptz not null default now()
);

create table if not exists public.workshop_registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  attendee_name text not null,
  email text not null,
  session_label text not null,
  status text not null default 'requested' check (status in ('requested','confirmed','waitlist','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text not null,
  message text not null,
  status text not null default 'new' check (status in ('new','read','replied','archived')),
  created_at timestamptz not null default now()
);

create index if not exists idx_cart_items_user_id on public.cart_items(user_id);
create index if not exists idx_orders_user_created on public.orders(user_id, created_at desc);
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_workshops_user_created on public.workshop_registrations(user_id, created_at desc);
create index if not exists idx_contact_messages_created on public.contact_messages(created_at desc);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, customer_code)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', ''), 'CZ-' || upper(substr(replace(new.id::text, '-', ''), 1, 10)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.workshop_registrations enable row level security;
alter table public.contact_messages enable row level security;

create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "products_public_read" on public.products for select to anon, authenticated using (active = true);
create policy "cart_select_own" on public.cart_items for select to authenticated using (auth.uid() = user_id);
create policy "cart_insert_own" on public.cart_items for insert to authenticated with check (auth.uid() = user_id);
create policy "cart_update_own" on public.cart_items for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cart_delete_own" on public.cart_items for delete to authenticated using (auth.uid() = user_id);
create policy "orders_select_own" on public.orders for select to authenticated using (auth.uid() = user_id);
create policy "orders_insert_own" on public.orders for insert to authenticated with check (auth.uid() = user_id);
create policy "order_items_select_own" on public.order_items for select to authenticated using (exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid()));
create policy "order_items_insert_own" on public.order_items for insert to authenticated with check (exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid()));
create policy "workshops_select_own" on public.workshop_registrations for select to authenticated using (auth.uid() = user_id);
create policy "workshops_insert_own" on public.workshop_registrations for insert to authenticated with check (auth.uid() = user_id);
create policy "workshops_delete_own" on public.workshop_registrations for delete to authenticated using (auth.uid() = user_id and status = 'requested');
create policy "contact_submit" on public.contact_messages for insert to anon, authenticated with check (user_id is null or user_id = auth.uid());

create or replace function public.place_order(
  p_email text, p_first_name text, p_last_name text, p_address text,
  p_city text, p_postal_code text, p_delivery_method text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_subtotal numeric(10,2);
  v_shipping numeric(10,2);
  v_order public.orders;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_delivery_method not in ('ship', 'pickup') then raise exception 'Invalid delivery method'; end if;
  select coalesce(sum(ci.quantity * p.price), 0) into v_subtotal
  from public.cart_items ci join public.products p on p.slug = ci.product_slug and p.active = true
  where ci.user_id = v_user_id;
  if v_subtotal <= 0 then raise exception 'Your cart is empty'; end if;
  v_shipping := case when p_delivery_method = 'pickup' or v_subtotal >= 75 then 0 else 7 end;
  insert into public.orders (user_id,email,first_name,last_name,address,city,postal_code,delivery_method,subtotal,shipping,total)
  values (v_user_id,p_email,p_first_name,p_last_name,p_address,p_city,p_postal_code,p_delivery_method,v_subtotal,v_shipping,v_subtotal + v_shipping)
  returning * into v_order;
  insert into public.order_items (order_id,product_slug,name_snapshot,unit_price,quantity)
  select v_order.id,p.slug,p.name,p.price,ci.quantity from public.cart_items ci
  join public.products p on p.slug = ci.product_slug and p.active = true where ci.user_id = v_user_id;
  delete from public.cart_items where user_id = v_user_id;
  return jsonb_build_object('id',v_order.id,'order_number',v_order.order_number,'total',v_order.total,'status',v_order.status,'created_at',v_order.created_at);
end;
$$;

revoke all on function public.place_order(text,text,text,text,text,text,text) from public;
grant execute on function public.place_order(text,text,text,text,text,text,text) to authenticated;
