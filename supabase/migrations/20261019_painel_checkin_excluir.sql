-- Painel no dia da festa: check-in na porta, ajuste de acompanhantes e exclusão de convidado.
-- Rodar uma vez no SQL Editor do projeto CRM Vitalício (lffzxqwgqgsiumunahyt).

alter table public.inscricoes_aniversario_juan add column if not exists chegou_em timestamptz;

drop policy if exists "logados_editam_inscricoes" on public.inscricoes_aniversario_juan;
create policy "logados_editam_inscricoes" on public.inscricoes_aniversario_juan for update to authenticated using (true) with check (true);
drop policy if exists "logados_excluem_inscricoes" on public.inscricoes_aniversario_juan;
create policy "logados_excluem_inscricoes" on public.inscricoes_aniversario_juan for delete to authenticated using (true);

grant update (acompanhantes, chegou_em) on public.inscricoes_aniversario_juan to authenticated;
grant delete on public.inscricoes_aniversario_juan to authenticated;
