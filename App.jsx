import { useState, useEffect } from "react";

const STORAGE_KEY = "urlop-tracker-v3";
const STATUSY = ["✅ Zatwierdzone", "⏳ Oczekuje", "❌ Odrzucone"];
const STATUS_COLORS = {
  "✅ Zatwierdzone": { bg: "#d1fae5", text: "#065f46" },
  "⏳ Oczekuje":    { bg: "#fef3c7", text: "#92400e" },
  "❌ Odrzucone":   { bg: "#fee2e2", text: "#991b1b" },
};

function formatDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
}

function nMonthsAhead(n) {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d.toISOString().split("T")[0];
}

const emptyForm = { od: "", do: "", opis: "", godz: "", status: "✅ Zatwierdzone", calEventId: null };

// ── Anthropic + Google Calendar MCP ──────────────────────
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

async function callAI(userPrompt, systemPrompt) {
  const res = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      mcp_servers: [{ type: "url", url: "https://gcal.mcp.claude.com/mcp", name: "google-calendar" }]
    })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function extractText(data) {
  return (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
}

function parseJSON(text) {
  try { return JSON.parse(text.trim().replace(/```json|```/g, "").trim()); }
  catch { return null; }
}

async function gcalFetchVacations() {
  const today = new Date().toISOString().split("T")[0];
  const ahead = nMonthsAhead(6);
  const data = await callAI(
    `List calendar events from ${today} to ${ahead}. Find all vacation, leave, urlop, wolne, holiday, day-off events. Return ONLY a raw JSON array:\n[{"title":"...","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","calEventId":"..."}]\nIf none, return [].`,
    "You manage Google Calendar. Return only raw JSON array, no markdown, no explanation."
  );
  return parseJSON(extractText(data)) || [];
}

async function gcalCreate(title, startDate, endDate) {
  const data = await callAI(
    `Create an all-day calendar event: title="${title}", from ${startDate} to ${endDate}. Return ONLY raw JSON: {"eventId":"...","success":true}`,
    "You manage Google Calendar. Create events and return only raw JSON."
  );
  return parseJSON(extractText(data)) || { success: false };
}

async function gcalDelete(eventId) {
  await callAI(
    `Delete calendar event ID: ${eventId}`,
    "You manage Google Calendar. Delete the event."
  );
}

// ── App ───────────────────────────────────────────────────
export default function App() {
  const [pula, setPula]         = useState(200);
  const [wpisy, setWpisy]       = useState([]);
  const [loaded, setLoaded]     = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState(emptyForm);
  const [editPula, setEditPula] = useState(false);
  const [tempPula, setTempPula] = useState("200");
  const [view, setView]         = useState("home");
  const [syncing, setSyncing]   = useState(false);
  const [syncMsg, setSyncMsg]   = useState("");
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(STORAGE_KEY);
        if (r?.value) {
          const d = JSON.parse(r.value);
          setPula(d.pula ?? 200);
          setTempPula(String(d.pula ?? 200));
          setWpisy(d.wpisy ?? []);
        }
      } catch {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.storage.set(STORAGE_KEY, JSON.stringify({ pula, wpisy })).catch(() => {});
  }, [pula, wpisy, loaded]);

  const zatwierdzone = wpisy.filter(w => w.status === "✅ Zatwierdzone");
  const wykorzystane = zatwierdzone.reduce((s, w) => s + Number(w.godz || 0), 0);
  const pozostalo    = pula - wykorzystane;
  const pct          = pula > 0 ? Math.min(100, (wykorzystane / pula) * 100) : 0;
  const progColor    = pct > 85 ? "#ef4444" : pct > 60 ? "#f59e0b" : "#10b981";
  const C            = 2 * Math.PI * 38;

  function otworzForm(wpis = null) {
    if (wpis) {
      setEditId(wpis.id);
      setForm({ od: wpis.od, do: wpis.do, opis: wpis.opis, godz: String(wpis.godz), status: wpis.status, calEventId: wpis.calEventId || null });
    } else {
      setEditId(null);
      setForm(emptyForm);
    }
    setShowForm(true);
  }

  async function zapiszWpis() {
    const g = parseFloat(form.godz);
    if (!form.godz || isNaN(g) || g <= 0) return;
    setSaving(true);
    let calEventId = form.calEventId;
    if (form.od && !calEventId) {
      try {
        const r = await gcalCreate(form.opis || "Urlop", form.od, form.do || form.od);
        calEventId = r.eventId || null;
      } catch {}
    }
    const entry = { ...form, godz: g, calEventId, id: editId || Date.now() };
    if (editId) setWpisy(w => w.map(x => x.id === editId ? entry : x));
    else        setWpisy(w => [...w, entry]);
    setSaving(false);
    setShowForm(false);
  }

  async function usunWpis(id) {
    const wpis = wpisy.find(w => w.id === id);
    if (wpis?.calEventId) { try { await gcalDelete(wpis.calEventId); } catch {} }
    setWpisy(w => w.filter(x => x.id !== id));
  }

  function zatwierdzPule() {
    const v = parseFloat(tempPula);
    if (!isNaN(v) && v > 0) setPula(v);
    setEditPula(false);
  }

  async function syncFromCalendar() {
    setSyncing(true);
    setSyncMsg("Pobieranie z Google Calendar…");
    try {
      const events = await gcalFetchVacations();
      if (!events.length) {
        setSyncMsg("Nie znaleziono urlopów w kalendarzu.");
        setTimeout(() => setSyncMsg(""), 3000);
        setSyncing(false);
        return;
      }
      let added = 0;
      const newWpisy = [...wpisy];
      for (const ev of events) {
        const exists = newWpisy.some(w =>
          (w.calEventId && w.calEventId === ev.calEventId) ||
          (w.opis === ev.title && w.od === ev.startDate)
        );
        if (!exists) {
          const days = (ev.startDate && ev.endDate)
            ? Math.max(1, Math.round((new Date(ev.endDate) - new Date(ev.startDate)) / 86400000) + 1)
            : 1;
          newWpisy.push({
            id: Date.now() + Math.random(),
            opis: ev.title, od: ev.startDate, do: ev.endDate || ev.startDate,
            godz: days * 8, status: "✅ Zatwierdzone", calEventId: ev.calEventId,
          });
          added++;
        }
      }
      setWpisy(newWpisy);
      setSyncMsg(added > 0 ? `✅ Zaimportowano ${added} wydarzeń!` : "Wszystkie już są w trackerze.");
    } catch {
      setSyncMsg("❌ Błąd połączenia z Google Calendar.");
    }
    setTimeout(() => setSyncMsg(""), 4000);
    setSyncing(false);
  }

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: "#0f172a", color: "#f1f5f9", fontFamily: "'DM Sans','Segoe UI',sans-serif", paddingBottom: 90 }}>

      {/* TOP */}
      <div style={{ padding: "20px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "#475569", textTransform: "uppercase" }}>Automation Champions</div>
          <div style={{ fontSize: 20, fontWeight: 800, background: "linear-gradient(90deg,#38bdf8,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>🏖 Urlop</div>
        </div>
        <button onClick={() => otworzForm()} style={{ background: "linear-gradient(135deg,#38bdf8,#818cf8)", border: "none", borderRadius: 14, padding: "10px 18px", color: "#0f172a", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>+ Dodaj</button>
      </div>

      {/* SYNC */}
      <div style={{ padding: "12px 20px 0" }}>
        <button onClick={syncFromCalendar} disabled={syncing} style={{ width: "100%", padding: "12px", border: "1px solid rgba(66,133,244,0.4)", borderRadius: 14, background: syncing ? "rgba(66,133,244,0.1)" : "rgba(66,133,244,0.15)", color: syncing ? "#64748b" : "#93c5fd", fontSize: 13, fontWeight: 600, cursor: syncing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span>{syncing ? "⏳" : "📅"}</span>
          {syncing ? "Synchronizowanie…" : "Synchronizuj z Google Calendar"}
        </button>
        {syncMsg && <div style={{ marginTop: 8, padding: "8px 14px", background: "rgba(255,255,255,0.05)", borderRadius: 10, fontSize: 13, color: "#94a3b8", textAlign: "center" }}>{syncMsg}</div>}
      </div>

      {/* TABS */}
      <div style={{ display: "flex", margin: "16px 20px 0", background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: 4, gap: 4 }}>
        {[["home","📊 Podsumowanie"],["lista","📋 Wpisy"]].map(([v,l]) => (
          <button key={v} onClick={() => setView(v)} style={{ flex: 1, padding: "10px 0", border: "none", borderRadius: 11, fontSize: 13, fontWeight: 600, cursor: "pointer", background: view===v ? "rgba(56,189,248,0.2)" : "transparent", color: view===v ? "#38bdf8" : "#64748b" }}>{l}</button>
        ))}
      </div>

      {/* HOME */}
      {view === "home" && (
        <div style={{ padding: "20px 20px 0" }}>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, padding: "28px 20px", marginBottom: 14, display: "flex", alignItems: "center", gap: 24 }}>
            <svg width={90} height={90} style={{ flexShrink: 0 }}>
              <circle cx={45} cy={45} r={38} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8}/>
              <circle cx={45} cy={45} r={38} fill="none" stroke={progColor} strokeWidth={8} strokeDasharray={C} strokeDashoffset={C*(1-pct/100)} strokeLinecap="round" transform="rotate(-90 45 45)" style={{ transition: "stroke-dashoffset 0.8s ease" }}/>
              <text x={45} y={49} textAnchor="middle" fill={progColor} fontSize={15} fontWeight={800} fontFamily="DM Sans,sans-serif">{pct.toFixed(0)}%</text>
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>Pozostało</div>
              <div style={{ fontSize: 42, fontWeight: 800, color: progColor, lineHeight: 1 }}>{pozostalo % 1 === 0 ? pozostalo : pozostalo.toFixed(1)}</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>godzin z {pula}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div onClick={() => { setEditPula(true); setTempPula(String(pula)); }} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(56,189,248,0.25)", borderRadius: 18, padding: "16px 14px", cursor: "pointer" }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: "#64748b", textTransform: "uppercase", marginBottom: 8 }}>Pula ✏️</div>
              {editPula ? (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input autoFocus type="number" value={tempPula} onChange={e => setTempPula(e.target.value)} onKeyDown={e => { if (e.key==="Enter") zatwierdzPule(); if (e.key==="Escape") setEditPula(false); }} onClick={e => e.stopPropagation()} style={{ width: "100%", background: "rgba(56,189,248,0.12)", border: "1px solid #38bdf8", borderRadius: 8, padding: "6px 8px", color: "#38bdf8", fontSize: 20, fontWeight: 800, outline: "none" }}/>
                  <button onClick={e => { e.stopPropagation(); zatwierdzPule(); }} style={{ background: "#38bdf8", border: "none", borderRadius: 8, padding: "7px 10px", color: "#0f172a", fontWeight: 800, cursor: "pointer" }}>✓</button>
                </div>
              ) : (
                <div style={{ fontSize: 32, fontWeight: 800, color: "#38bdf8" }}>{pula}<span style={{ fontSize: 13, color: "#64748b", fontWeight: 400 }}> h</span></div>
              )}
            </div>
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 18, padding: "16px 14px" }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: "#64748b", textTransform: "uppercase", marginBottom: 8 }}>Zużyte</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#f59e0b" }}>{wykorzystane % 1 === 0 ? wykorzystane : wykorzystane.toFixed(1)}<span style={{ fontSize: 13, color: "#64748b", fontWeight: 400 }}> h</span></div>
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: "16px 18px", marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 10 }}>
              <span>Postęp wykorzystania</span>
              <span style={{ color: progColor, fontWeight: 700 }}>{pct.toFixed(1)}%</span>
            </div>
            <div style={{ height: 10, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${progColor},${progColor}99)`, borderRadius: 99, transition: "width 0.7s ease" }}/>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "#475569" }}><span>0 h</span><span>{pula} h</span></div>
          </div>

          {wpisy.length > 0 && (
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, padding: "14px 18px" }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: 2 }}>Statystyki</div>
              {[["Liczba wpisów", wpisy.length], ["Zatwierdzonych", zatwierdzone.length], ["Zsync. z GCal 📅", wpisy.filter(w=>w.calEventId).length]].map(([l,v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 14 }}>
                  <span style={{ color: "#94a3b8" }}>{l}</span><span style={{ fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LISTA */}
      {view === "lista" && (
        <div style={{ padding: "16px 20px 0" }}>
          {wpisy.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#475569" }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🌴</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Brak wpisów</div>
              <div style={{ fontSize: 13 }}>Kliknij „+ Dodaj" lub zsynchronizuj z Google Calendar</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {wpisy.map(w => {
                const sc = STATUS_COLORS[w.status] || STATUS_COLORS["⏳ Oczekuje"];
                return (
                  <div key={w.id} style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${w.calEventId ? "rgba(66,133,244,0.35)" : "rgba(255,255,255,0.08)"}`, borderRadius: 16, padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ flex: 1, paddingRight: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                          {w.calEventId && <span style={{ fontSize: 10, background: "rgba(66,133,244,0.2)", color: "#93c5fd", borderRadius: 6, padding: "2px 6px" }}>📅 GCal</span>}
                          <span style={{ fontWeight: 700, fontSize: 15 }}>{w.opis || <span style={{ color: "#475569", fontStyle: "italic", fontWeight: 400 }}>bez opisu</span>}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{w.od ? `${formatDate(w.od)}${w.do && w.do !== w.od ? ` → ${formatDate(w.do)}` : ""}` : "Brak daty"}</div>
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b", flexShrink: 0 }}>{w.godz}h</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ background: sc.bg, color: sc.text, borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 600 }}>{w.status}</span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => otworzForm(w)} style={{ background: "rgba(56,189,248,0.15)", border: "none", borderRadius: 10, padding: "8px 14px", color: "#38bdf8", cursor: "pointer", fontSize: 14 }}>✏️</button>
                        <button onClick={() => usunWpis(w.id)} style={{ background: "rgba(239,68,68,0.15)", border: "none", borderRadius: 10, padding: "8px 14px", color: "#ef4444", cursor: "pointer", fontSize: 14 }}>🗑</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, display: "flex", alignItems: "flex-end" }} onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div style={{ background: "#1e293b", borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", width: "100%", maxWidth: 430, margin: "0 auto", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.15)", borderRadius: 99, margin: "0 auto 20px" }}/>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>{editId ? "✏️ Edytuj wpis" : "🏖 Nowy wpis urlopowy"}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 20 }}>📅 Podaj daty → wpis trafi automatycznie do Google Calendar</div>

            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Liczba godzin *</label>
              <input type="number" min="0.5" step="0.5" placeholder="np. 8" value={form.godz} onChange={e => setForm(x => ({ ...x, godz: e.target.value }))} style={{ ...inp, fontSize: 28, fontWeight: 800, color: "#38bdf8", textAlign: "center", padding: "14px" }}/>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <div><label style={lbl}>Data od</label><input type="date" value={form.od} onChange={e => setForm(x => ({ ...x, od: e.target.value }))} style={inp}/></div>
              <div><label style={lbl}>Data do</label><input type="date" value={form.do} onChange={e => setForm(x => ({ ...x, do: e.target.value }))} style={inp}/></div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Opis</label>
              <input type="text" placeholder="np. Urlop letni, Wizyta lekarska…" value={form.opis} onChange={e => setForm(x => ({ ...x, opis: e.target.value }))} style={inp}/>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={lbl}>Status</label>
              <div style={{ display: "flex", gap: 6 }}>
                {STATUSY.map(s => {
                  const sc = STATUS_COLORS[s]; const on = form.status === s;
                  return <button key={s} onClick={() => setForm(x => ({ ...x, status: s }))} style={{ flex: 1, padding: "10px 4px", border: "none", borderRadius: 12, background: on ? sc.bg : "rgba(255,255,255,0.07)", color: on ? sc.text : "#64748b", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>{s}</button>;
                })}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: 16, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, background: "transparent", color: "#64748b", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Anuluj</button>
              <button onClick={zapiszWpis} disabled={saving} style={{ flex: 2, padding: 16, border: "none", borderRadius: 16, background: saving ? "rgba(56,189,248,0.4)" : "linear-gradient(135deg,#38bdf8,#818cf8)", color: "#0f172a", fontSize: 15, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "⏳ Zapisywanie…" : editId ? "Zapisz" : "Dodaj wpis"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inp = { width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "12px 14px", color: "#f1f5f9", fontSize: 15, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const lbl = { display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 6, letterSpacing: 1.5, textTransform: "uppercase" };
