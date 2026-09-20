# Noite de Gratidão — convite e confirmação de presença (Juan, 19/10)

Página única (`index.html`), sem dependências: fotos já embutidas, fontes do Google Fonts.

## Como publicar o link
GitHub → Settings → Pages → Source: *Deploy from a branch* → escolha o branch e a pasta `/ (root)`.
O link fica: `https://altaimpactoprojetos-blip.github.io/projetos/aniversario-juan/`

## Como ativar o envio das confirmações
No fim do `index.html`, bloco `CONFIGURAÇÃO DO ENVIO`:

- **Opção A – banco (Supabase):** preencher `SUPABASE_URL` e `SUPABASE_KEY` (chave publishable) e ter a tabela `confirmacoes_aniversario_juan` com política de INSERT para `anon`.
- **Opção B – WhatsApp:** preencher `WHATSAPP` com o número do Juan (só dígitos, com 55 + DDD). O convidado envia a confirmação como mensagem pronta.

Enquanto nada estiver preenchido, o botão avisa que o envio ainda não foi ativado.
