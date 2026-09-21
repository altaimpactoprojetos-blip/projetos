# Noite de Gratidão — convite e inscrições (Juan, 19/10 às 19h)

## Arquivos
- `index.html` — convite com envelope, informações e formulário de inscrição. Fotos embutidas.
- `inscricoes.html` — painel restrito para ver quem se inscreveu (login Supabase Auth, usuário `inscricoes@juanbusiness.online`), busca e download em CSV.

## Estrutura do repositório
- `index.html` / `inscricoes.html` — site.
- `.github/workflows/pages.yml` — publicação automática no GitHub Pages.
- `supabase/migrations/*.sql` — SQL do banco (tabela, permissões, RPCs, gatilho).
- `supabase/functions/*` — Edge Functions (e-mail ao convidado e imagem do QR).

## Backend (Supabase, projeto **CRM Vitalício** `lffzxqwgqgsiumunahyt`)
- Tabela `public.inscricoes_aniversario_juan` (nome, telefone, acompanhantes, recado, criado_em).
- RLS: a chave pública só **insere**; só usuário **logado** lê.
- Gatilho `trg_notificar_inscricao_aniversario_juan` (pg_net) chama a Edge Function `notificar-inscricao` a cada inscrição.
- Edge Function envia ao **convidado** um e-mail de confirmação pela **Brevo** (API transacional), com número da inscrição e dados da festa.
  Segredos no **Vault** do Supabase (Database → Vault), lidos pela RPC `segredo_evento` (só a chave de serviço):
  - `BREVO_API_KEY` — chave de API da Brevo.
  - `NOTIFY_FROM_EMAIL` — remetente verificado na Brevo: `convite@juanbusiness.online` (domínio autenticado).
  - `NOTIFY_FROM_NAME` — nome do remetente (padrão: "Noite de Gratidão").
  - `NOTIFY_REPLY_TO` — para onde vão as respostas dos convidados (padrão: altaimpactoprojetos@gmail.com).
- Edge Function `qr-inscricao` (pública, por UUID) gera a imagem PNG do QR code usada no e-mail.
- Edge Function `brevo-dominio` (uso único, já executada) autentica o domínio na Brevo e cadastra o remetente.
- O organizador acompanha as inscrições em `inscricoes.html` (não recebe e-mail).

## Publicação (GitHub Pages + domínio)
Arquivos na raiz do repositório; `CNAME` = `juanbusiness.online`.

- GitHub → Settings → Pages → Source: *Deploy from a branch*, branch `claude/birthday-signup-link-ifrv9h`, pasta `/ (root)`. Custom domain: `juanbusiness.online`, marcar *Enforce HTTPS* quando liberar.
- DNS do domínio (onde ele foi registrado):
  - `A` @ → 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
  - `CNAME` www → altaimpactoprojetos-blip.github.io

### Domínio na Brevo (e-mail saindo de @juanbusiness.online)
O domínio `juanbusiness.online` está **autenticado** na Brevo (Senders, Domains & Dedicated IPs → Domains) e o remetente `convite@juanbusiness.online` está cadastrado. Registros criados no DNS da Hostinger:

| Tipo  | Nome (host)         | Valor |
|-------|---------------------|-------|
| TXT   | `@`                 | `brevo-code:869e3b357f565714697992d082362c86` |
| CNAME | `brevo1._domainkey` | `b1.juanbusiness-online.dkim.brevo.com` |
| CNAME | `brevo2._domainkey` | `b2.juanbusiness-online.dkim.brevo.com` |
| TXT   | `_dmarc`            | `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com` |

Esses registros não interferem nos registros A/CNAME do GitHub Pages. As respostas dos convidados vão para o Gmail via `NOTIFY_REPLY_TO`.

Links finais:
- Convite: https://juanbusiness.online/
- Inscrições: https://juanbusiness.online/inscricoes.html

