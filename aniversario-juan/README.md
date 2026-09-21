# Noite de Gratidão — convite e inscrições (Juan, 19/10 às 19h)

## Arquivos
- `index.html` — convite com envelope, informações e formulário de inscrição. Fotos embutidas.
- `inscricoes.html` — painel restrito para ver quem se inscreveu (login com Supabase Auth), busca e download em CSV.

## Backend (Supabase, projeto **CRM Vitalício** `lffzxqwgqgsiumunahyt`)
- Tabela `public.inscricoes_aniversario_juan` (nome, telefone, acompanhantes, recado, criado_em).
- RLS: a chave pública só **insere**; só usuário **logado** lê.
- Gatilho `trg_notificar_inscricao_aniversario_juan` (pg_net) chama a Edge Function `notificar-inscricao` a cada inscrição.
- Edge Function envia e-mail pela **Brevo** (API transacional). Segredos (Project Settings → Edge Functions → Secrets):
  - `BREVO_API_KEY` — obrigatório (Brevo → SMTP & API → API Keys).
  - `NOTIFY_EMAIL` — destino (padrão: solysprojetos@gmail.com).
  - `NOTIFY_FROM_EMAIL` — remetente; precisa ser um remetente verificado na Brevo (padrão: igual ao destino).
  - `NOTIFY_FROM_NAME` — nome do remetente (padrão: "Noite de Gratidão").

## Publicar o link
GitHub → Settings → Pages → *Deploy from a branch* → branch + pasta `/ (root)`.
- Convite: `https://altaimpactoprojetos-blip.github.io/projetos/aniversario-juan/`
- Inscrições: `https://altaimpactoprojetos-blip.github.io/projetos/aniversario-juan/inscricoes.html`
