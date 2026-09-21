import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import QRCode from "npm:qrcode@1.5.4";

// Imagem PNG do QR code de uma inscrição, usada no e-mail de confirmação.
// Pública (sem JWT): o id é um UUID aleatório e a imagem só contém número, nome e quantidade.

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("id inválido", { status: 400 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: row } = await supabase
    .from("inscricoes_aniversario_juan")
    .select("numero, nome, acompanhantes")
    .eq("id", id)
    .maybeSingle();
  if (!row) return new Response("não encontrada", { status: 404 });

  const numero = String(row.numero ?? "").padStart(3, "0");
  const pessoas = 1 + Number(row.acompanhantes || 0);
  const texto = `NOITE DE GRATIDÃO · 19/10 · 19h\nInscrição nº ${numero}\n${row.nome}\n${pessoas} pessoa${pessoas > 1 ? "s" : ""}`;

  const png: Uint8Array = await QRCode.toBuffer(texto, {
    type: "png", errorCorrectionLevel: "M", width: 360, margin: 2,
    color: { dark: "#2B2620", light: "#FFFFFF" },
  });
  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});
