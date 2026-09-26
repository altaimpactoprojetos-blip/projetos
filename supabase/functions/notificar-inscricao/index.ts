import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Chamada pelo gatilho do banco (pg_net) a cada nova inscrição.
// Envia ao CONVIDADO um e-mail de confirmação pela API da Brevo.
// Segredos no Vault (RPC segredo_evento): BREVO_API_KEY, NOTIFY_FROM_EMAIL, NOTIFY_FROM_NAME, NOTIFY_REPLY_TO.

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
  // Quando o remetente é um endereço do domínio (sem caixa de entrada), as respostas vão para cá.
  const replyTo = (await segredo("NOTIFY_REPLY_TO")) ?? "altaimpactoprojetos@gmail.com";
  if (!apiKey) return json({ ok: false, erro: "BREVO_API_KEY ausente" });

  const numero = String(row.numero ?? "").padStart(3, "0");
  const primeiroNome = row.nome.trim().split(/\s+/)[0];
  const pessoas = 1 + Number(row.acompanhantes || 0);
  const mapa = "https://www.google.com/maps/search/?api=1&query=Buffet+Monte+Rey";
  const qrUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/qr-inscricao?id=${row.id}`;

  const linha = (k: string, v: string) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #F1EBDD;text-align:left;font-family:Arial,sans-serif;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#A8842E">${k}</td>
      <td style="padding:10px 0;border-bottom:1px solid #F1EBDD;text-align:right;font-family:Georgia,serif;font-size:17px;color:#2B2620">${v}</td>
    </tr>`;

  const html = `
  <div style="background:#F8F5EF;padding:24px 12px;font-family:Arial,sans-serif;color:#2B2620">
    <div style="max-width:420px;margin:auto;background:#fff;border:1px solid #E9D9B0;padding:28px 22px;text-align:center">
      <p style="letter-spacing:.3em;font-size:11px;color:#A8842E;margin:0 0 10px">PRESENÇA CONFIRMADA</p>
      <p style="font-family:Georgia,serif;font-size:30px;margin:0 0 6px;color:#2B2620">Obrigado, <span style="color:#A8842E">${esc(primeiroNome)}</span>!</p>
      <p style="color:#6F665C;font-size:14px;margin:0 0 18px">Seu lugar está garantido. Anote os detalhes:</p>

      <table style="width:100%;border-collapse:collapse;border-top:1px solid #E9D9B0;border-bottom:1px solid #E9D9B0">
        ${linha("Data", "19 de outubro")}
        ${linha("Horário", "18h")}
        ${linha("Local", `<a href="${mapa}" style="color:#2B2620;text-decoration:none;border-bottom:1px solid #E9D9B0">Monte Rey Buffet</a>`)}
        ${linha("Dress code", "Tons claros")}
      </table>

      <div style="margin:22px auto 0;max-width:300px;background:#F8F5EF;border:1px solid #E9D9B0;padding:20px 16px 16px">
        <p style="letter-spacing:.28em;font-size:11px;color:#A8842E;margin:0 0 8px">SUA INSCRIÇÃO</p>
        <p style="font-family:Georgia,serif;font-size:38px;font-weight:bold;margin:0 0 14px;color:#2B2620">Nº ${numero}</p>
        <div style="background:#fff;border:1px solid #E9D9B0;padding:10px;display:inline-block">
          <img src="${qrUrl}" width="180" height="180" alt="QR code da inscrição nº ${numero}" style="display:block;width:180px;height:180px">
        </div>
        <p style="color:#6F665C;font-size:12px;margin:12px 0 0">${esc(row.nome)} · ${pessoas} pessoa${pessoas > 1 ? "s" : ""}<br>Apresente este QR code na entrada.</p>
      </div>

      <div style="margin:22px auto 0;max-width:300px;border-top:1px solid #E9D9B0;padding-top:16px">
        <p style="letter-spacing:.28em;font-size:11px;color:#A8842E;margin:0 0 8px">SUGESTÕES DE PRESENTE</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#2B2620">
          <tr><td style="padding:5px 0;text-align:left;color:#6F665C">Blusa</td><td style="padding:5px 0;text-align:right;font-family:Georgia,serif;font-size:16px">M</td></tr>
          <tr><td style="padding:5px 0;text-align:left;color:#6F665C;border-top:1px solid #F1EBDD">Calça e short</td><td style="padding:5px 0;text-align:right;font-family:Georgia,serif;font-size:16px;border-top:1px solid #F1EBDD">42</td></tr>
          <tr><td style="padding:5px 0;text-align:left;color:#6F665C;border-top:1px solid #F1EBDD">Sapato</td><td style="padding:5px 0;text-align:right;font-family:Georgia,serif;font-size:16px;border-top:1px solid #F1EBDD">42 / 43</td></tr>
          <tr><td style="padding:5px 0;text-align:left;color:#6F665C;border-top:1px solid #F1EBDD">Perfumes</td><td style="padding:5px 0;text-align:right;font-family:Georgia,serif;font-size:16px;border-top:1px solid #F1EBDD">Al Batal / Musaman<br>YSL / Valentino</td></tr>
          <tr><td style="padding:5px 0;text-align:left;color:#6F665C;border-top:1px solid #F1EBDD">Material</td><td style="padding:5px 0;text-align:right;font-family:Georgia,serif;font-size:16px;border-top:1px solid #F1EBDD">Para video maker</td></tr>
        </table>
      </div>

      <p style="font-family:Georgia,serif;font-style:italic;font-size:17px;color:#A8842E;margin:22px 0 0">Com carinho, Juan</p>
    </div>
  </div>`;

  // Versão em texto simples: e-mails só com HTML têm mais chance de cair no spam.
  const texto = [
    `Obrigado, ${primeiroNome}! Sua presença na Noite de Gratidão está confirmada.`,
    "",
    `Inscrição nº ${numero} · ${row.nome} · ${pessoas} pessoa${pessoas > 1 ? "s" : ""}`,
    "",
    "Data: 19 de outubro",
    "Horário: 18h",
    `Local: Monte Rey Buffet (${mapa})`,
    "Dress code: Tons claros",
    "",
    "Apresente o QR code deste e-mail na entrada.",
    "",
    "Sugestões de presente: blusa M, calça e short 42, sapato 42/43, perfumes (Al Batal, Musaman, YSL ou Valentino) e material para video maker.",
    "",
    "Com carinho, Juan",
  ].join("\n");

  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "api-key": apiKey },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      replyTo: { name: fromName, email: replyTo },
      to: [{ email: row.email, name: row.nome }],
      subject: `Presença confirmada · Noite de Gratidão (inscrição nº ${numero})`,
      htmlContent: html,
      textContent: texto,
      tags: ["noite-de-gratidao", "confirmacao-convidado"],
    }),
  });
  const txt = await r.text();
  if (!r.ok) console.error("Brevo falhou:", r.status, txt);
  return json({ ok: r.ok, status: r.status, brevo: txt });
});
