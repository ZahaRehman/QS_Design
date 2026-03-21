-- Canvas-only pricing: migrate legacy base price into canvas_sizes, then drop column.

update public.products
set
  canvas_sizes = jsonb_build_array(
    jsonb_build_object(
      'id',
      gen_random_uuid()::text,
      'label',
      'Standard',
      'price_cents',
      price_cents
    )
  )
where
  canvas_sizes is null
  or canvas_sizes = '[]'::jsonb
  or (
    jsonb_typeof(canvas_sizes) = 'array'
    and jsonb_array_length(canvas_sizes) = 0
  );

alter table public.products drop column if exists price_cents;
