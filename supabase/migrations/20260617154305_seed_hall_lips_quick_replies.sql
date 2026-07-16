insert into public.quick_replies (title, body, category)
select 'Saudação Lips', 'Olá! Tudo bem? Como posso ajudar?', 'lips'
where not exists (select 1 from public.quick_replies where title = 'Saudação Lips');

insert into public.quick_replies (title, body, category)
select 'Saudação Hall', 'Olá! Tudo bem? Como posso ajudar?', 'hall'
where not exists (select 1 from public.quick_replies where title = 'Saudação Hall');
