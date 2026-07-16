alter table public.group_contact_list_items
  add column if not exists review_status text not null default 'pending';

alter table public.group_contact_list_items
  drop constraint if exists group_contact_list_items_review_status_check;

alter table public.group_contact_list_items
  add constraint group_contact_list_items_review_status_check
  check (review_status in ('pending', 'approved', 'rejected'));

create index if not exists idx_group_contact_list_items_review_status
  on public.group_contact_list_items(review_status);
