import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Disparo "É HOJE!" para todos os inscritos com e-mail (Brevo).
// Chamada pelo banco (net.http_post) com o token do Vault DISPARO_TOKEN.
// Marca disparo_hoje_em em cada inscrição enviada: rodar de novo só manda para quem faltou.

type Row = { id: string; numero: number; nome: string; email: string; acompanhantes: number };

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  let body: { token?: string; so?: string } = {};
  try { body = await req.json(); } catch { /* corpo vazio */ }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const segredo = async (nome: string) => {
    const { data } = await supabase.rpc("segredo_evento", { nome_segredo: nome });
    return (data as string | null) ?? undefined;
  };

  const token = await segredo("DISPARO_TOKEN");
  if (!token || body.token !== token) return json({ ok: false, erro: "não autorizado" }, 401);

  const apiKey = await segredo("BREVO_API_KEY");
  const fromEmail = (await segredo("NOTIFY_FROM_EMAIL")) ?? "altaimpactoprojetos@gmail.com";
  const fromName = (await segredo("NOTIFY_FROM_NAME")) ?? "Noite de Gratidão";
  const replyTo = (await segredo("NOTIFY_REPLY_TO")) ?? "altaimpactoprojetos@gmail.com";
  if (!apiKey) return json({ ok: false, erro: "BREVO_API_KEY ausente" });

  let q = supabase
    .from("inscricoes_aniversario_juan")
    .select("id, numero, nome, email, acompanhantes")
    .not("email", "is", null)
    .is("disparo_hoje_em", null)
    .order("numero");
  if (body.so) q = q.eq("id", body.so);
  const { data, error } = await q;
  if (error) return json({ ok: false, erro: error.message }, 500);

  // Um e-mail por endereço, mesmo que a pessoa tenha se inscrito duas vezes.
  const vistos = new Set<string>();
  const lista = (data as Row[]).filter((r) => {
    const e = r.email.trim().toLowerCase();
    if (vistos.has(e)) return false;
    vistos.add(e);
    return true;
  });

  const foto = "https://juanbusiness.online/e-hoje.jpg";
  const mapa = "https://www.google.com/maps/search/?api=1&query=Monte+Rey+Buffet+Maracana%C3%BA";
  const endereco = "Rodovia CE-065, Km 10, nº 10359B · Maracanaú";

  async function enviar(r: Row) {
    const primeiroNome = r.nome.trim().split(/\s+/)[0];
    const numero = String(r.numero ?? "").padStart(3, "0");
    const qrUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/qr-inscricao?id=${r.id}`;
    const html = `
  <div style="background:#F8F5EF;padding:24px 12px;font-family:Arial,sans-serif;color:#2B2620">
    <div style="max-width:440px;margin:auto;background:#fff;border:1px solid #E9D9B0;text-align:center">
      <a href="https://juanbusiness.online/hoje.html"><img src="${foto}" width="440" alt="Noite de Gratidão — É hoje! 18h30 no Monte Rey Buffet" style="display:block;width:100%;height:auto;border:0"></a>
      <div style="padding:24px 22px 26px">
        <p style="font-family:Georgia,serif;font-size:30px;font-weight:bold;margin:0 0 10px;color:#A8842E">É HOJEEEEEE!</p>
        <p style="font-size:16px;line-height:1.5;margin:0 0 18px;color:#2B2620">${esc(primeiroNome)}, estarei te esperando para juntamente comigo viver essa noite mágica 💝</p>
        <p style="font-family:Georgia,serif;font-size:22px;margin:0 0 4px;color:#2B2620">18h30 · Monte Rey Buffet</p>
        <p style="font-size:13px;color:#6F665C;margin:0 0 14px">${endereco}</p>
        <a href="${mapa}" style="display:inline-block;background:#B8923C;color:#fff;text-decoration:none;font-size:12px;letter-spacing:.18em;padding:12px 22px;border-radius:2px">VER NO MAPA</a>
        <div style="margin:24px auto 0;max-width:260px;background:#F8F5EF;border:1px solid #E9D9B0;padding:16px">
          <p style="letter-spacing:.28em;font-size:11px;color:#A8842E;margin:0 0 6px">SUA ENTRADA · Nº ${numero}</p>
          <img src="${qrUrl}" width="160" height="160" alt="QR code da inscrição nº ${numero}" style="display:block;margin:0 auto;width:160px;height:160px;background:#fff;border:1px solid #E9D9B0;padding:8px">
          <p style="color:#6F665C;font-size:12px;margin:10px 0 0">Apresente na entrada.</p>
        </div>
        <p style="font-family:Georgia,serif;font-style:italic;font-size:17px;color:#A8842E;margin:22px 0 0">Com carinho, Juan</p>
      </div>
    </div>
  </div>`;
    const texto = [
      "É HOJEEEEEE!",
      "",
      `${primeiroNome}, estarei te esperando para juntamente comigo viver essa noite mágica 💝`,
      "",
      "Hoje, 18h30 · Monte Rey Buffet",
      endereco,
      `Mapa: ${mapa}`,
      "",
      `Sua inscrição: nº ${numero} (QR code para a entrada: ${qrUrl})`,
      "",
      "Com carinho, Juan",
    ].join("\n");

    const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "api-key": apiKey! },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        replyTo: { name: fromName, email: replyTo },
        to: [{ email: r.email.trim(), name: r.nome }],
        subject: "É HOJE! ✨ Noite de Gratidão às 18h30",
        htmlContent: html,
        textContent: texto,
        tags: ["noite-de-gratidao", "disparo-e-hoje"],
      }),
    });
    const txt = await resp.text();
    if (resp.ok) {
      await supabase.from("inscricoes_aniversario_juan").update({ disparo_hoje_em: new Date().toISOString() }).eq("id", r.id);
    } else {
      console.error("Brevo falhou:", r.email, resp.status, txt);
    }
    return { numero: r.numero, ok: resp.ok, status: resp.status, erro: resp.ok ? undefined : txt.slice(0, 200) };
  }

  const resultados: Awaited<ReturnType<typeof enviar>>[] = [];
  for (let i = 0; i < lista.length; i += 5) {
    resultados.push(...(await Promise.all(lista.slice(i, i + 5).map(enviar))));
  }
  const falhas = resultados.filter((x) => !x.ok);
  return json({ ok: falhas.length === 0, enviados: resultados.length - falhas.length, falhas });
});
