import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Função auxiliar (uso único): autentica o domínio juanbusiness.online na Brevo
// e cadastra o remetente convite@juanbusiness.online. Não recebe parâmetros.
// Já foi executada em 21/09/2026; fica aqui como registro e para reexecução se preciso.

const DOMINIO = "juanbusiness.online";
const REMETENTE = { name: "Noite de Gratidão", email: `convite@${DOMINIO}` };

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: apiKey } = await supabase.rpc("segredo_evento", { nome_segredo: "BREVO_API_KEY" });
  if (!apiKey) return new Response(JSON.stringify({ erro: "BREVO_API_KEY ausente" }), { status: 500 });
  const h = { "api-key": apiKey as string, Accept: "application/json", "Content-Type": "application/json" };

  const auth = await fetch(`https://api.brevo.com/v3/senders/domains/${DOMINIO}/authenticate`, { method: "PUT", headers: h });
  const authTxt = await auth.text();

  const status = await fetch(`https://api.brevo.com/v3/senders/domains/${DOMINIO}`, { headers: h });
  const statusTxt = await status.text();

  const lista = await fetch("https://api.brevo.com/v3/senders", { headers: h });
  const senders = (await lista.json()).senders ?? [];
  let senderTxt = "já existe";
  if (!senders.some((s: { email: string }) => s.email === REMETENTE.email)) {
    const cr = await fetch("https://api.brevo.com/v3/senders", { method: "POST", headers: h, body: JSON.stringify(REMETENTE) });
    senderTxt = `${cr.status} ${await cr.text()}`;
  }

  return new Response(JSON.stringify({ autenticar: { status: auth.status, body: authTxt }, dominio: statusTxt, remetente: senderTxt }), {
    headers: { "Content-Type": "application/json" },
  });
});
