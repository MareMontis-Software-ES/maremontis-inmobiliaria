// Funció del servidor (Supabase Edge Function) per gestionar els usuaris des de Configuració → Usuaris.
// Crear un usuari o canviar-li la contrasenya o l'e-mail necessita la clau de servei, que només
// existeix aquí al servidor (mai a l'app). Només la pot fer servir un administrador actiu.
//   action "create":   e-mail, contrasenya, nom, permís i responsable → usuari nou, ja confirmat
//   action "password": id + contrasenya nova
//   action "email":    id + e-mail nou (canvia l'accés i la fitxa)
//   action "active":   id + actiu (si no és actiu, el servidor li bloqueja l'entrada)
import { createClient } from "jsr:@supabase/supabase-js@2";

type Row = Record<string, any>;
const ROLES = ["admin", "oficina", "consulta"];
const MIN_PASSWORD = 8;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const reply = (status: number, body: Row) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

/** Id de l'usuari que fa la petició, si és un administrador actiu */
async function callerAdminId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;
  const user = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const [{ data: who }, { data: isAdmin }] = await Promise.all([user.auth.getUser(), user.rpc("app_is_admin")]);
  return isAdmin === true && who?.user ? who.user.id : null;
}

const validEmail = (e: unknown): e is string => typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
const validPassword = (p: unknown): p is string => typeof p === "string" && p.length >= MIN_PASSWORD;

/** Tradueix els errors més habituals de Supabase Auth */
function authError(e: { message?: string } | null): string {
  const m = String(e?.message || e || "");
  if (/already (been )?registered|already exists/i.test(m)) return "Ja hi ha un usuari amb aquest e-mail.";
  if (/password/i.test(m)) return "La contrasenya no és vàlida: " + m;
  return m || "Error desconegut";
}

async function create(p: Row) {
  if (!validEmail(p.email)) return { ok: false, message: "L'e-mail no és vàlid." };
  if (!validPassword(p.password)) return { ok: false, message: `La contrasenya ha de tenir com a mínim ${MIN_PASSWORD} caràcters.` };
  const email = p.email.trim().toLowerCase();
  const fullName = String(p.full_name || "").trim() || email.split("@")[0];
  const role = ROLES.includes(p.role) ? p.role : "consulta";
  const { data, error } = await admin.auth.admin.createUser({ email, password: p.password, email_confirm: true, user_metadata: { full_name: fullName } });
  if (error || !data.user) return { ok: false, message: authError(error) };
  // El disparador de la base de dades ja ha creat la fitxa a admi_users (amb «Només consulta»): s'hi posa el permís triat
  const { error: pErr } = await admin.from("admi_users")
    .upsert({ id: data.user.id, email, full_name: fullName, role, is_responsible: !!p.is_responsible, active: true });
  if (pErr) return { ok: false, message: "L'usuari s'ha creat però no s'ha pogut desar el permís: " + pErr.message };
  return { ok: true, id: data.user.id, message: `Usuari creat: ${email}. Ja pot entrar amb aquesta contrasenya.` };
}

async function setPassword(p: Row) {
  if (!validPassword(p.password)) return { ok: false, message: `La contrasenya ha de tenir com a mínim ${MIN_PASSWORD} caràcters.` };
  const { error } = await admin.auth.admin.updateUserById(p.id, { password: p.password });
  return error ? { ok: false, message: authError(error) } : { ok: true, message: "Contrasenya canviada." };
}

async function setEmail(p: Row) {
  if (!validEmail(p.email)) return { ok: false, message: "L'e-mail no és vàlid." };
  const email = p.email.trim().toLowerCase();
  const { error } = await admin.auth.admin.updateUserById(p.id, { email, email_confirm: true });
  if (error) return { ok: false, message: authError(error) };
  await admin.from("admi_users").update({ email }).eq("id", p.id);
  return { ok: true, message: `E-mail canviat: ara entra amb ${email}.` };
}

async function setActive(p: Row, me: string) {
  if (p.id === me && !p.active) return { ok: false, message: "No et pots donar de baixa a tu mateix." };
  // «876000h» = 100 anys: l'usuari no pot entrar fins que es torni a marcar com a actiu
  const { error } = await admin.auth.admin.updateUserById(p.id, { ban_duration: p.active ? "none" : "876000h" });
  if (error) return { ok: false, message: authError(error) };
  await admin.from("admi_users").update({ active: !!p.active }).eq("id", p.id);
  return { ok: true, message: p.active ? "Usuari actiu: ja pot tornar a entrar." : "Usuari donat de baixa: ja no pot entrar." };
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const me = await callerAdminId(req);
    if (!me) return reply(403, { message: "Només un administrador pot gestionar els usuaris." });
    const p: Row = await req.json().catch(() => ({}));
    if (p.action === "create") return reply(200, await create(p));
    if (typeof p.id !== "string" || !p.id) return reply(400, { message: "Falta l'usuari." });
    if (p.action === "password") return reply(200, await setPassword(p));
    if (p.action === "email") return reply(200, await setEmail(p));
    if (p.action === "active") return reply(200, await setActive(p, me));
    return reply(400, { message: "Acció desconeguda" });
  } catch (e) {
    return reply(500, { message: String((e as Error).message || e) });
  }
});
