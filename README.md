# Noite de Gratidão — convite e inscrições (Juan, 19/10 às 19h)

## Arquivos
- `index.html` — convite com envelope, informações e formulário de inscrição. Fotos embutidas.
- `inscricoes.html` — painel restrito para ver quem se inscreveu (login com Supabase Auth), busca e download em CSV.

## Backend (Supabase, projeto **CRM Vitalício** `lffzxqwgqgsiumunahyt`)
- Tabela `public.inscricoes_aniversario_juan` (nome, telefone, acompanhantes, recado, criado_em).
- RLS: a chave pública só **insere**; só usuário **logado** lê.
- Gatilho `trg_notificar_inscricao_aniversario_juan` (pg_net) chama a Edge Function `notificar-inscricao` a cada inscrição.
- Edge Function envia ao **convidado** um e-mail de confirmação pela **Brevo** (API transacional), com número da inscrição e dados da festa.
  Segredos no **Vault** do Supabase (Database → Vault), lidos pela RPC `segredo_evento` (só a chave de serviço):
  - `BREVO_API_KEY` — chave de API da Brevo.
  - `NOTIFY_FROM_EMAIL` — remetente verificado na Brevo (altaimpactoprojetos@gmail.com).
  - `NOTIFY_FROM_NAME` — nome do remetente (padrão: "Noite de Gratidão").
- O organizador acompanha as inscrições em `inscricoes.html` (não recebe e-mail).

## Publicação (GitHub Pages + domínio)
Arquivos na raiz do repositório; `CNAME` = `juanbusiness.online`.

- GitHub → Settings → Pages → Source: *Deploy from a branch*, branch `claude/birthday-signup-link-ifrv9h`, pasta `/ (root)`. Custom domain: `juanbusiness.online`, marcar *Enforce HTTPS* quando liberar.
- DNS do domínio (onde ele foi registrado):
  - `A` @ → 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
  - `CNAME` www → altaimpactoprojetos-blip.github.io

Links finais:
- Convite: https://juanbusiness.online/
- Inscrições: https://juanbusiness.online/inscricoes.html

