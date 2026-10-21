-- Noite de Gratidão (Juan) — REMOÇÃO de tudo que era do evento no banco.
-- O evento já aconteceu; apaga as inscrições (dados pessoais dos convidados), funções,
-- gatilho, segredos do Vault e o usuário de login do painel. IRREVERSÍVEL.
--
-- Como usar: Supabase → projeto CRM Vitalício → SQL Editor → colar tudo → Run.

begin;

-- 1. Gatilho e funções do evento
drop trigger if exists trg_notificar_inscricao_aniversario_juan on public.inscricoes_aniversario_juan;
drop function if exists public.notificar_inscricao_aniversario_juan();
drop function if exists public.inscrever_aniversario_juan(text, text, int, text, text);
drop function if exists public.segredo_evento(text);

-- 2. Tabela com as inscrições (72 linhas) e suas políticas
drop table if exists public.inscricoes_aniversario_juan;

-- 3. Segredos do Vault: BREVO_API_KEY e NOTIFY_FROM_EMAIL agora são usados pelo aviso de
--    cotação do site Trajano Seguros (função notificar-cotacao) — NÃO apagar. Só o que era só do evento:
delete from vault.secrets where name in ('NOTIFY_FROM_NAME');

-- 4. Usuário que acessava o painel inscricoes.html
delete from auth.identities where user_id in (select id from auth.users where email = 'inscricoes@juanbusiness.online');
delete from auth.users where email = 'inscricoes@juanbusiness.online';

commit;

-- Conferência (deve devolver 0 em todas as colunas):
select
  (select count(*) from pg_tables where tablename = 'inscricoes_aniversario_juan') as tabela,
  (select count(*) from pg_proc where proname in ('inscrever_aniversario_juan', 'notificar_inscricao_aniversario_juan', 'segredo_evento')) as funcoes,
  (select count(*) from vault.secrets where name in ('NOTIFY_FROM_NAME')) as segredos,
  (select count(*) from auth.users where email = 'inscricoes@juanbusiness.online') as usuario;

-- NÃO incluído de propósito (não há sinal de que sejam do evento; confira antes de mexer):
--   segredos do Vault BREVO_SMTP_KEY, BREVO_SMTP_LOGIN, DISPARO_TOKEN, NOTIFY_EMAIL
--
-- Edge Functions não se apagam por SQL. Em Edge Functions, no painel do Supabase, apague
-- (NÃO apague a notificar-cotacao, que é do site Trajano Seguros):
--   notificar-inscricao  (e-mail de confirmação ao convidado)
--   qr-inscricao         (imagem do QR code do e-mail)
--   disparo-email-hoje   (criada em 19/10, disparo "É HOJE" — provavelmente do evento)
--   brevo-dominio e brevo-dominio-tmp (criadas no mesmo dia da notificar-inscricao; confira)
-- A função "crm" é do CRM: mantenha.
