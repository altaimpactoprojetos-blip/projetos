-- Painel no dia da festa: check-in na porta, ajuste de acompanhantes e exclusão de convidado.
-- Rodar uma vez no SQL Editor do projeto CRM Vitalício (lffzxqwgqgsiumunahyt).

alter table public.inscricoes_aniversario_juan add column if not exists chegou_em timestamptz;

drop policy if exists "logados_editam_inscricoes" on public.inscricoes_aniversario_juan;
create policy "logados_editam_inscricoes" on public.inscricoes_aniversario_juan for update to authenticated using (true) with check (true);
drop policy if exists "logados_excluem_inscricoes" on public.inscricoes_aniversario_juan;
create policy "logados_excluem_inscricoes" on public.inscricoes_aniversario_juan for delete to authenticated using (true);

grant update (acompanhantes, chegou_em) on public.inscricoes_aniversario_juan to authenticated;
grant delete on public.inscricoes_aniversario_juan to authenticated;

-- Disparo "É HOJE!" por e-mail (Edge Function disparo-email-hoje).
alter table public.inscricoes_aniversario_juan add column if not exists disparo_hoje_em timestamptz;
-- Segredo DISPARO_TOKEN criado no Vault (valor aleatório, não fica neste arquivo):
--   select vault.create_secret(encode(extensions.gen_random_bytes(24),'hex'), 'DISPARO_TOKEN');
-- Disparo (só manda para quem ainda não recebeu):
--   select net.http_post(url := 'https://lffzxqwgqgsiumunahyt.supabase.co/functions/v1/disparo-email-hoje',
--     headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <chave anon>'),
--     body := jsonb_build_object('token', public.segredo_evento('DISPARO_TOKEN')), timeout_milliseconds := 140000);
