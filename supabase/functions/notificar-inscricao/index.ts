import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Chamada pelo gatilho do banco (pg_net) a cada nova inscrição.
// Recebe a linha em `record`; se vier só o id, busca com a chave de serviço.
// Envia um e-mail via Resend. Segredos: RESEND_API_KEY (obrigatório), NOTIFY_EMAIL, NOTIFY_FROM.

type Row = { id?: string; nome: string; telefone?: string | null; acompanhantes: number; recado?: string | null; criado_em: string };

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
        .select("id, nome, telefone, acompanhantes, recado, criado_em")
        .eq("id", id)
        .maybeSingle();
      row = data as Row | null;
    }
  }
  if (!row) return new Response(JSON.stringify({ ok: false, erro: "inscrição não encontrada" }), { status: 404 });

  const { count } = await supabase
    .from("inscricoes_aniversario_juan")
    .select("id", { count: "exact", head: true });

  const apiKey = Deno.env.get("RESEND_API_KEY");
  const to = Deno.env.get("NOTIFY_EMAIL") ?? "solysprojetos@gmail.com";
  const from = Deno.env.get("NOTIFY_FROM") ?? "Noite de Gratidão <onboarding@resend.dev>";
  if (!apiKey) {
    console.warn("RESEND_API_KEY não configurada; e-mail não enviado.");
    return new Response(JSON.stringify({ ok: false, erro: "RESEND_API_KEY ausente", inscricao: row.nome }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }

  const quando = new Date(row.criado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const pessoas = 1 + Number(row.acompanhantes || 0);
  const html = `
    <div style="font-family:Georgia,serif;max-width:520px;margin:auto;padding:24px;border:1px solid #E9D9B0">
      <p style="letter-spacing:.3em;font-size:11px;color:#A8842E;margin:0 0 8px">NOITE DE GRATIDÃO · NOVA INSCRIÇÃO</p>
      <h2 style="margin:0 0 16px;color:#2B2620">${esc(row.nome)}</h2>
      <table style="font-family:Arial,sans-serif;font-size:14px;color:#2B2620;border-collapse:collapse">
        <tr><td style="padding:4px 12px 4px 0;color:#6F665C">WhatsApp</td><td>${esc(row.telefone) || "—"}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#6F665C">Acompanhantes</td><td>${esc(row.acompanhantes)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#6F665C">Recado</td><td>${esc(row.recado) || "—"}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#6F665C">Quando</td><td>${esc(quando)}</td></tr>
      </table>
      <p style="font-family:Arial,sans-serif;font-size:13px;color:#6F665C;margin-top:20px">Total de inscrições até agora: <strong>${count ?? "?"}</strong></p>
    </div>`;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from, to: [to],
      subject: `Nova inscrição: ${row.nome} (${pessoas} pessoa${pessoas > 1 ? "s" : ""})`,
      html,
    }),
  });
  const txt = await r.text();
  if (!r.ok) console.error("Resend falhou:", r.status, txt);
  return new Response(JSON.stringify({ ok: r.ok, resend: txt }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
});
