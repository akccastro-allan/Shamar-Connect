# Supabase Production Security Backlog

Este backlog registra dividas de seguranca observadas no ambiente Supabase Production que nao devem ser corrigidas no PR 39.

O objetivo do PR 39 e paridade de schema e reconstrucao segura de ambientes novos, sem hardening amplo do Production.

## Fora Do Escopo Do PR 39

- Views com comportamento `SECURITY DEFINER` ou equivalente que exigem revisao dedicada.
- Funcoes com `search_path` mutavel.
- RPCs `SECURITY DEFINER` acessiveis por `anon` ou `authenticated`.
- Grants historicos amplos que precisam de avaliacao por produto e operacao.
- Ajustes de policies que possam alterar comportamento de clientes em producao.

## Regras Para PR Futuro

- Gerar relatorio do Supabase Advisor antes/depois.
- Corrigir uma classe de risco por PR.
- Validar impacto em tenants reais antes de merge.
- Nao misturar hardening com migrations de paridade historica.
