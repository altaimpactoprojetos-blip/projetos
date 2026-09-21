import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Chamada pelo gatilho do banco (pg_net) a cada nova inscrição.
// Envia ao CONVIDADO um e-mail de confirmação pela API da Brevo.
// Segredos no Vault (RPC segredo_evento): BREVO_API_KEY, NOTIFY_FROM_EMAIL, NOTIFY_FROM_NAME.

type Row = { id?: string; numero?: number; nome: string; email?: string | null; telefone?: string | null; acompanhantes: number; recado?: string | null; criado_em: string };

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  let body: { id?: string; record?: Partial<Row> & { id?: string } } = {};
  try { body = await req.json(); } catch { /* corpo vazio */ }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let row: Row | null = body.record && body.record.nome ? (body.record as Row) : null;
  const id = body.id ?? body.record?.id;
  if (!row && id) {
    for (let i = 0; i < 3 && !row; i++) {
      if (i) await sleep(1500);
      const { data } = await supabase
        .from("inscricoes_aniversario_juan")
        .select("id, numero, nome, email, telefone, acompanhantes, recado, criado_em")
        .eq("id", id)
        .maybeSingle();
      row = data as Row | null;
    }
  }
  if (!row) return json({ ok: false, erro: "inscrição não encontrada" }, 404);
  if (!row.email) return json({ ok: false, erro: "inscrição sem e-mail; nada a enviar", numero: row.numero });

  async function segredo(nome: string): Promise<string | undefined> {
    const env = Deno.env.get(nome);
    if (env) return env;
    const { data } = await supabase.rpc("segredo_evento", { nome_segredo: nome });
    return (data as string | null) ?? undefined;
  }

  const apiKey = await segredo("BREVO_API_KEY");
  const fromEmail = (await segredo("NOTIFY_FROM_EMAIL")) ?? "altaimpactoprojetos@gmail.com";
  const fromName = (await segredo("NOTIFY_FROM_NAME")) ?? "Noite de Gratidão";
  if (!apiKey) return json({ ok: false, erro: "BREVO_API_KEY ausente" });

  const numero = String(row.numero ?? "").padStart(3, "0");
  const primeiroNome = row.nome.trim().split(/\s+/)[0];
  const pessoas = 1 + Number(row.acompanhantes || 0);
  const mapa = "https://www.google.com/maps/search/?api=1&query=Buffet+Monte+Rey";

  const linha = (k: string, v: string) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #F1EBDD;font-family:Arial,sans-serif;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#A8842E">${k}</td>
      <td style="padding:10px 0;border-bottom:1px solid #F1EBDD;text-align:right;font-family:Georgia,serif;font-size:17px;color:#2B2620">${v}</td>
    </tr>`;

  const html = `
  <div style="background:#F8F5EF;padding:32px 16px;font-family:Arial,sans-serif;color:#2B2620">
    <div style="max-width:520px;margin:auto;background:#fff;border:1px solid #E9D9B0;padding:36px 28px">
      <p style="text-align:center;letter-spacing:.34em;font-size:11px;color:#A8842E;margin:0 0 10px">JUAN CONVIDA</p>
      <p style="text-align:center;font-family:Georgia,serif;font-size:34px;line-height:1.1;margin:0;color:#4A3B22;letter-spacing:.04em">NOITE DE</p>
      <p style="text-align:center;font-family:Georgia,serif;font-size:38px;line-height:1.1;margin:0 0 22px;color:#B8923C;letter-spacing:.04em">GRATIDÃO</p>
      <p style="text-align:center;letter-spacing:.3em;font-size:11px;color:#A8842E;margin:0 0 6px">PRESENÇA CONFIRMADA</p>
      <p style="text-align:center;font-family:Georgia,serif;font-size:26px;margin:0 0 8px">Obrigado, ${esc(primeiroNome)}!</p>
      <p style="text-align:center;color:#6F665C;font-size:14px;margin:0 0 24px">Seu lugar está garantido. Guarde este e-mail e apresente o número na entrada.</p>
      <div style="text-align:center;background:#F8F5EF;border:1px solid #E9D9B0;padding:16px;margin:0 0 24px">
        <p style="letter-spacing:.28em;font-size:11px;color:#A8842E;margin:0 0 6px">SUA INSCRIÇÃO</p>
        <p style="font-family:Georgia,serif;font-size:40px;font-weight:bold;margin:0;color:#2B2620">Nº ${numero}</p>
        <p style="color:#6F665C;font-size:13px;margin:6px 0 0">${esc(row.nome)} · ${pessoas} pessoa${pessoas > 1 ? "s" : ""}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #E9D9B0">
        ${linha("Data", "19 de outubro")}
        ${linha("Horário", "19h")}
        ${linha("Local", `<a href="${mapa}" style="color:#2B2620;text-decoration:none;border-bottom:1px solid #E9D9B0">Monte Rey Buffet</a>`)}
        ${linha("Dress code", "Tons pastéis")}
      </table>
      <div style="margin:26px 0 0;border:1px solid #E9D9B0;padding:18px 20px;background:#FCFAF6">
        <p style="text-align:center;letter-spacing:.28em;font-size:11px;color:#A8842E;margin:0 0 12px">SUGESTÕES DE PRESENTE</p>
        <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;color:#2B2620">
          <tr><td style="padding:6px 0;color:#6F665C">Blusa</td><td style="padding:6px 0;text-align:right;font-family:Georgia,serif;font-size:16px">Tamanho M</td></tr>
          <tr><td style="padding:6px 0;color:#6F665C;border-top:1px solid #F1EBDD">Calça e short</td><td style="padding:6px 0;text-align:right;font-family:Georgia,serif;font-size:16px;border-top:1px solid #F1EBDD">Tamanho 42</td></tr>
          <tr><td style="padding:6px 0;color:#6F665C;border-top:1px solid #F1EBDD">Sapato</td><td style="padding:6px 0;text-align:right;font-family:Georgia,serif;font-size:16px;border-top:1px solid #F1EBDD">42 / 43</td></tr>
          <tr><td style="padding:6px 0;color:#6F665C;border-top:1px solid #F1EBDD">Perfume</td><td style="padding:6px 0;text-align:right;font-family:Georgia,serif;font-size:16px;border-top:1px solid #F1EBDD">À sua escolha</td></tr>
        </table>
      </div>
      <p style="text-align:center;color:#6F665C;font-size:13px;margin:26px 0 0">Sua presença torna essa noite ainda mais especial.</p>
      <p style="text-align:center;font-family:Georgia,serif;font-style:italic;font-size:18px;color:#A8842E;margin:10px 0 0">Com carinho, Juan</p>
    </div>
  </div>`;

  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "api-key": apiKey },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: row.email, name: row.nome }],
      subject: `Presença confirmada · Noite de Gratidão (inscrição nº ${numero})`,
      htmlContent: html,
      tags: ["noite-de-gratidao", "confirmacao-convidado"],
    }),
  });
  const txt = await r.text();
  if (!r.ok) console.error("Brevo falhou:", r.status, txt);
  return json({ ok: r.ok, status: r.status, brevo: txt });
});
