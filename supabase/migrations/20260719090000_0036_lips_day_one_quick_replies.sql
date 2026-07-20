-- 0036: Respostas rápidas mínimas para o primeiro dia da equipe Lips.
-- Idempotente, escopada pela organização do canal lips-main.
-- Não habilita agente automático e não envia mensagens.

with lips_scope as (
  select c.tenant_id, c.organization_id
  from public.channels c
  where c.session_id = 'lips-main'
    and c.slug = 'lips'
  limit 1
), replies(title, body, category, tags) as (
  values
    ('Saudação', 'Olá! Você está falando com a Auto Peças e Auto Center Lips. Como podemos ajudar?', 'lips', array['lips', 'primeiro-dia', 'saudacao']::text[]),
    ('Dados do veículo', 'Para localizar a peça correta, informe modelo, ano, motorização e, se possível, a placa.', 'lips', array['lips', 'primeiro-dia', 'veiculo']::text[]),
    ('Consulta de peça', 'Vamos verificar disponibilidade e valor. Um atendente dará continuidade ao orçamento.', 'lips', array['lips', 'primeiro-dia', 'orcamento']::text[]),
    ('Oficina', 'Também realizamos serviços e agendamentos. Informe o veículo e o serviço desejado.', 'lips', array['lips', 'primeiro-dia', 'oficina']::text[]),
    ('Encaminhamento', 'Sua solicitação foi encaminhada para o setor responsável.', 'lips', array['lips', 'primeiro-dia', 'transferencia']::text[]),
    ('Aguarde', 'Recebemos sua mensagem. Em breve um atendente continuará o atendimento.', 'lips', array['lips', 'primeiro-dia', 'aguarde']::text[])
)
insert into public.quick_replies (tenant_id, organization_id, title, body, category, tags, is_active)
select scope.tenant_id, scope.organization_id, replies.title, replies.body, replies.category, replies.tags, true
from lips_scope scope
cross join replies
where not exists (
  select 1
  from public.quick_replies existing
  where existing.tenant_id = scope.tenant_id
    and existing.organization_id = scope.organization_id
    and existing.title = replies.title
    and existing.category = replies.category
);
