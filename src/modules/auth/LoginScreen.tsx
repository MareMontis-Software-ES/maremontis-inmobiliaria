import { useState } from "react";
import { House } from "lucide-react";
import { supabase, supabaseMissingConfig } from "../../lib/supabase";

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError(error.message === "Invalid login credentials" ? "Usuari o contrasenya incorrectes." : error.message);
    setBusy(false);
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand-symbol"><House size={38} /></div>
        <h1>MareMontis</h1>
        <p>Administració immobiliària</p>
        {supabaseMissingConfig && <div className="data-error">Falta configurar el fitxer <code>.env</code> amb VITE_SUPABASE_URL i VITE_SUPABASE_PUBLISHABLE_KEY.</div>}
        <label className="field"><span>Correu electrònic</span><input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label className="field"><span>Contrasenya</span><input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
        {error && <div className="data-error">{error}</div>}
        <button className="save-btn auth-submit" disabled={busy}>{busy ? "Accedint…" : "Iniciar sessió"}</button>
        <small>Accés restringit a usuaris autoritzats.</small>
      </form>
    </div>
  );
}
