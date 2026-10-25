// Funció del servidor (Supabase Edge Function) que envia les felicitacions per correu.
//   mode "daily": el planificador (pg_cron) la crida cada hora des de l'hora triada; envia les
//                 felicitacions que toquen avui i que encara no s'han enviat (un grup per crida).
//   mode "test":  un administrador envia una prova a l'adreça que indiqui.
// El correu surt pel servidor SMTP de l'empresa, configurat a Configuració → Correu sortint
// (admi_settings 'smtp' + contrasenya xifrada al Vault).
import { createClient } from "jsr:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

type Row = Record<string, any>;
const KINDS = ["felicitacio_aniversari", "felicitacio_nadal"];
const BATCH = 40;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const reply = (status: number, body: Row) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

/** Data d'avui a Espanya (AAAA-MM-DD) */
const todayMadrid = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fill = (t: string, v: Record<string, string>) => t.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in v ? v[k] : m));

function html(body: string, withImage: boolean) {
  const paras = esc(body).split(/\n{2,}/).map(p => `<p style="margin:0 0 14px">${p.replace(/\n/g, "<br>")}</p>`).join("");
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f1ec;font-family:Arial,Helvetica,sans-serif;color:#2b2b2b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden">
${withImage ? `<tr><td><img src="cid:felicitacio" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto"></td></tr>` : ""}
<tr><td style="padding:28px 32px;font-size:16px;line-height:1.55">${paras}</td></tr>
</table></td></tr></table></body></html>`;
}

type Image = { content: Uint8Array; contentType: string };

async function loadContext() {
  const [{ data: cfgRow }, { data: tpls, error: tErr }] = await Promise.all([
    admin.from("admi_settings").select("value").eq("key", "greetings").maybeSingle(),
    admin.from("admi_email_templates").select("kind, language, subject, body, reviewed").in("kind", KINDS),
  ]);
  if (tErr) throw tErr;
  const cfg: Row = cfgRow?.value || {};
  // Imatge de cada felicitació en l'idioma del client (o la general, «*»); es descarrega una sola vegada
  const cache = new Map<string, Image | null>();
  async function imageFor(kind: string, language: string): Promise<Image | null> {
    const byLang: Row = cfg.images?.[kind] || {};
    const path: string = byLang[language] || byLang["*"] || "";
    if (!path) return null;
    if (!cache.has(path)) {
      const { data } = await admin.storage.from("fotos").download(path);
      cache.set(path, data ? { content: new Uint8Array(await data.arrayBuffer()), contentType: data.type || "image/jpeg" } : null);
    }
    return cache.get(path) || null;
  }
  return { templates: (tpls || []) as Row[], imageFor };
}

/** Text revisat en l'idioma del client; si no n'hi ha, en anglès i després en castellà */
function pickTemplate(templates: Row[], kind: string, language: string, onlyReviewed: boolean) {
  const ok = templates.filter(t => t.kind === kind && (!onlyReviewed || t.reviewed !== false));
  return ok.find(t => t.language === language) || ok.find(t => t.language === "en") || ok.find(t => t.language === "es") || null;
}

async function transport() {
  const [{ data: row }, { data: pass }] = await Promise.all([
    admin.from("admi_settings").select("value").eq("key", "smtp").maybeSingle(),
    admin.rpc("admi_smtp_password"),
  ]);
  const smtp: Row = row?.value || {};
  if (!smtp.host || !smtp.user || !pass) return null;
  const port = Number(smtp.port || 465);
  const mailer = nodemailer.createTransport({ host: smtp.host, port, secure: port === 465, auth: { user: smtp.user, pass }, pool: true, maxConnections: 1 });
  return { mailer, from: String(smtp.from_email || smtp.user), fromName: String(smtp.from_name || "") };
}
type Smtp = NonNullable<Awaited<ReturnType<typeof transport>>>;

async function send(smtp: Smtp, image: Image | null, to: string, subject: string, body: string) {
  const name = smtp.fromName;
  await smtp.mailer.sendMail({
    from: name ? { name, address: smtp.from } : smtp.from,
    to, subject, text: body, html: html(body, !!image),
    attachments: image ? [{ filename: "felicitacio" + (image.contentType.includes("png") ? ".png" : ".jpg"), content: image.content, contentType: image.contentType, cid: "felicitacio" }] : [],
  });
}

function vars(kind: string, name: string, first: string, today: string) {
  const y = Number(today.slice(0, 4));
  // La felicitació de Nadal es desitja per a l'any que ve
  return { client: name, nom: first || name, any: String(kind === "felicitacio_nadal" ? y + 1 : y), data: today.split("-").reverse().join("/") };
}

async function isAdmin(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) return false;
  const user = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data } = await user.rpc("app_is_admin");
  return data === true;
}

async function runDaily() {
  const today = todayMadrid();
  const { data: due, error } = await admin.rpc("admi_greetings_due", { p_today: today });
  if (error) throw error;
  if (!due?.length) return { sent: 0, errors: 0, pending: 0 };
  const smtp = await transport();
  if (!smtp) return { sent: 0, errors: 0, pending: due.length, warning: "Falta configurar el correu sortint (Configuració → Correu sortint)." };
  const { templates, imageFor } = await loadContext();
  let sent = 0, errors = 0;
  for (const d of (due as Row[]).slice(0, BATCH)) {
    const base = { client_id: d.client_id, kind: d.kind, year: d.year, email: d.email, language: d.language };
    const tpl = pickTemplate(templates, d.kind, d.language, true);
    if (!tpl) { await admin.from("admi_greeting_log").insert({ ...base, status: "error", error: "No hi ha cap text revisat per a aquest idioma ni en anglès." }); errors++; continue; }
    // Primer es reserva l'enviament: l'índex únic impedeix enviar-lo dues vegades
    const { data: claim, error: cErr } = await admin.from("admi_greeting_log").insert({ ...base, status: "sent" }).select("id").single();
    if (cErr) continue;
    const v = vars(d.kind, d.client_name, d.first_name, today);
    try { await send(smtp, await imageFor(d.kind, d.language), d.email, fill(tpl.subject, v), fill(tpl.body, v)); sent++; }
    catch (e) { await admin.from("admi_greeting_log").update({ status: "error", error: String((e as Error).message || e).slice(0, 500) }).eq("id", claim.id); errors++; }
  }
  smtp.mailer.close();
  return { sent, errors, pending: Math.max(0, due.length - BATCH) };
}

async function runTest(p: Row) {
  const smtp = await transport();
  if (!smtp) return { ok: false, message: "Falta configurar el correu sortint (Configuració → Correu sortint): servidor, usuari i contrasenya." };
  const { templates, imageFor } = await loadContext();
  const kind = KINDS.includes(p.kind) ? p.kind : KINDS[0];
  const tpl = pickTemplate(templates, kind, p.language || "ca", false);
  if (!tpl) return { ok: false, message: "No hi ha cap text per a aquesta felicitació." };
  const v = vars(kind, "Maria Exemple", "Maria", todayMadrid());
  try {
    await send(smtp, await imageFor(kind, p.language || "ca"), p.email, "[PROVA] " + fill(tpl.subject, v), fill(tpl.body, v));
    await admin.from("admi_greeting_log").insert({ kind, year: Number(todayMadrid().slice(0, 4)), email: p.email, language: tpl.language, status: "test" });
    return { ok: true, message: `Prova enviada a ${p.email} (text en ${tpl.language}).` };
  } catch (e) {
    return { ok: false, message: "El servidor de correu ha donat un error: " + String((e as Error).message || e) };
  } finally { smtp.mailer.close(); }
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const p: Row = await req.json().catch(() => ({}));
    const secret = req.headers.get("x-cron-secret");
    const fromCron = !!secret && (await admin.rpc("admi_greetings_cron_ok", { p_secret: secret })).data === true;
    if (p.mode === "daily" && (fromCron || await isAdmin(req))) return reply(200, await runDaily());
    if (p.mode === "test" && typeof p.email === "string" && p.email.includes("@") && await isAdmin(req)) return reply(200, await runTest(p));
    return reply(403, { message: "No autoritzat" });
  } catch (e) {
    return reply(500, { message: String((e as Error).message || e) });
  }
});
