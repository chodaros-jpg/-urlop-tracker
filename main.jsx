import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { supabase, supabaseConfigured, createCloudStorage } from './supabase.js'

const wrap = { maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: "#0f172a", color: "#f1f5f9", fontFamily: "'DM Sans','Segoe UI',sans-serif", padding: "40px 20px", boxSizing: "border-box" };
const inp = { width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "14px", color: "#f1f5f9", fontSize: 16, outline: "none", boxSizing: "border-box", fontFamily: "inherit", marginBottom: 12 };
const btn = { width: "100%", padding: 16, border: "none", borderRadius: 16, background: "linear-gradient(135deg,#38bdf8,#818cf8)", color: "#0f172a", fontSize: 15, fontWeight: 800, cursor: "pointer" };

function Header() {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 10, letterSpacing: 3, color: "#475569", textTransform: "uppercase" }}>Automation Champions</div>
      <div style={{ fontSize: 24, fontWeight: 800, background: "linear-gradient(90deg,#38bdf8,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>🏖 Urlop</div>
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function send() {
    if (!email.includes("@")) return;
    setBusy(true); setErr("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) setErr(error.message); else setSent(true);
  }

  return (
    <div style={wrap}>
      <Header />
      {sent ? (
        <div style={{ color: "#94a3b8", lineHeight: 1.5 }}>
          📧 Wysłałem link na <b style={{ color: "#f1f5f9" }}>{email}</b>.<br />
          Otwórz go w tej samej przeglądarce, żeby się zalogować.
        </div>
      ) : (
        <>
          <div style={{ color: "#94a3b8", marginBottom: 16, fontSize: 14 }}>Zaloguj się, dane zapisują się w chmurze.</div>
          <input type="email" placeholder="Twój email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} style={inp} />
          <button onClick={send} disabled={busy} style={btn}>{busy ? "⏳ Wysyłanie…" : "Wyślij link logowania"}</button>
          {err && <div style={{ marginTop: 12, color: "#fca5a5", fontSize: 13 }}>❌ {err}</div>}
        </>
      )}
    </div>
  );
}

function Root() {
  const [session, setSession] = useState(undefined);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <div style={wrap}><Header /><div style={{ color: "#64748b" }}>Ładowanie…</div></div>;
  if (!session) return <Login />;

  // App reads/writes through window.storage, so point it at Supabase for this user.
  window.storage = createCloudStorage(session.user.id, e => setSaveError(e ? e.message : null));

  async function eksportuj() {
    try {
      const r = await window.storage.get("urlop-tracker-v3");
      const data = r?.value ? JSON.parse(r.value) : { pula: 200, wpisy: [] };
      const blob = new Blob([JSON.stringify({ eksport: new Date().toISOString(), ...data }, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `urlop-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (e) {
      setSaveError("eksport nie udał się: " + (e?.message || e));
    }
  }

  return (
    <>
      {saveError && (
        <div style={{ position: "sticky", top: 0, zIndex: 100, background: "#7f1d1d", color: "#fecaca", padding: "10px 16px", fontSize: 13, textAlign: "center" }}>
          ❌ Nie udało się zapisać w chmurze: {saveError}
        </div>
      )}
      <App key={session.user.id} />
      <div style={{ maxWidth: 430, margin: "-60px auto 0", padding: "0 20px calc(40px + env(safe-area-inset-bottom))", textAlign: "center", fontSize: 12, color: "#475569", position: "relative" }}>
        <button onClick={eksportuj} style={{ width: "100%", padding: 12, marginBottom: 14, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, background: "rgba(255,255,255,0.04)", color: "#94a3b8", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          💾 Eksportuj dane do pliku
        </button>
        {session.user.email} · <span onClick={() => supabase.auth.signOut()} style={{ color: "#64748b", textDecoration: "underline", cursor: "pointer" }}>Wyloguj</span>
      </div>
    </>
  );
}

function MissingConfig() {
  return (
    <div style={wrap}>
      <Header />
      <div style={{ color: "#fca5a5", lineHeight: 1.5 }}>
        Brak konfiguracji Supabase. Ustaw zmienne VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY w Vercelu i zrób redeploy.
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {supabaseConfigured ? <Root /> : <MissingConfig />}
  </React.StrictMode>,
)

// Register PWA service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
