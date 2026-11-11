import { useState, useEffect } from "react";
import { t, tStatus } from "./i18n.jsx";

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

const emptyForm = { od: "", do: "", opis: "", godz: "", status: "✅ Zatwierdzone" };

// ── "Add to Google Calendar" link (no login, no setup) ─────
function addDays(iso, n) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function gcalLink(w, unit) {
  const start = w.od.replaceAll("-", "");
  const end = addDays(w.do || w.od, 1).replaceAll("-", ""); // all-day end date is exclusive
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `🏖 ${w.opis || t("calendarTitle")}`,
    dates: `${start}/${end}`,
    details: t("calendarDetails", w.godz, unit),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

// ── App ───────────────────────────────────────────────────
export default function App() {
  const [pula, setPula]         = useState(200);
  const [unit, setUnit]         = useState("h"); // "h" = hours, "d" = days (saved per user)
  const [wpisy, setWpisy]       = useState([]);
  const [loaded, setLoaded]     = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState(emptyForm);
  const [editPula, setEditPula] = useState(false);
  const [tempPula, setTempPula] = useState("200");
  const [view, setView]         = useState("home");
  const [syncMsg, setSyncMsg]   = useState("");
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(STORAGE_KEY);
        if (r?.value) {
          const d = JSON.parse(r.value);
          setPula(d.pula ?? 200);
          setUnit(d.unit === "d" ? "d" : "h");
          setTempPula(String(d.pula ?? 200));
          setWpisy(d.wpisy ?? []);
        }
        setLoaded(true);
      } catch {
        // Do not mark as loaded: otherwise the empty defaults would overwrite saved data.
        setSyncMsg(t("loadError"));
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.storage.set(STORAGE_KEY, JSON.stringify({ pula, wpisy, unit })).catch(() => {});
  }, [pula, wpisy, unit, loaded]);

  const zatwierdzone = wpisy.filter(w => w.status === "✅ Zatwierdzone");
  const wykorzystane = zatwierdzone.reduce((s, w) => s + Number(w.godz || 0), 0);
  const pozostalo    = pula - wykorzystane;
  const pct          = pula > 0 ? Math.min(100, (wykorzystane / pula) * 100) : 0;
  const progColor    = pct > 85 ? "#ef4444" : pct > 60 ? "#f59e0b" : "#10b981";
  const C            = 2 * Math.PI * 38;
  const u            = unit === "d" ? "d" : "h";
  const fmt          = n => (n % 1 === 0 ? n : n.toFixed(1));

  function otworzForm(wpis = null) {
    if (wpis) {
      setEditId(wpis.id);
      setForm({ od: wpis.od, do: wpis.do, opis: wpis.opis, godz: String(wpis.godz), status: wpis.status });
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
    const entry = { ...form, godz: g, id: editId || Date.now() };
    if (editId) setWpisy(w => w.map(x => x.id === editId ? entry : x));
    else        setWpisy(w => [...w, entry]);
    setSaving(false);
    setShowForm(false);
  }

  function usunWpis(id) {
    setWpisy(w => w.filter(x => x.id !== id));
  }

  function zatwierdzPule() {
    const v = parseFloat(tempPula);
    if (!isNaN(v) && v > 0) setPula(v);
    setEditPula(false);
  }

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: "#0f172a", color: "#f1f5f9", fontFamily: "'DM Sans','Segoe UI',sans-serif", paddingBottom: 90 }}>

      {/* TOP */}
      <div style={{ padding: "20px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "#475569", textTransform: "uppercase" }}>Automation Champions</div>
          <div style={{ fontSize: 20, fontWeight: 800, background: "linear-gradient(90deg,#38bdf8,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>🏖 {t("appName")}</div>
        </div>
        <button onClick={() => otworzForm()} style={{ background: "linear-gradient(135deg,#38bdf8,#818cf8)", border: "none", borderRadius: 14, padding: "10px 18px", color: "#0f172a", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{t("add")}</button>
      </div>

      {syncMsg && <div style={{ margin: "12px 20px 0", padding: "8px 14px", background: "rgba(255,255,255,0.05)", borderRadius: 10, fontSize: 13, color: "#94a3b8", textAlign: "center" }}>{syncMsg}</div>}

      {/* TABS */}
      <div style={{ display: "flex", margin: "16px 20px 0", background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: 4, gap: 4 }}>
        {[["home",t("tabHome")],["lista",t("tabList")]].map(([v,l]) => (
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
              <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>{t("remaining")}</div>
              <div style={{ fontSize: 42, fontWeight: 800, color: progColor, lineHeight: 1 }}>{fmt(pozostalo)}</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>{t("unitsOf", pula, unit)}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div onClick={() => { setEditPula(true); setTempPula(String(pula)); }} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(56,189,248,0.25)", borderRadius: 18, padding: "16px 14px", cursor: "pointer" }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: "#64748b", textTransform: "uppercase", marginBottom: 8 }}>{t("pool")}</div>
              {editPula ? (
                <div onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                  {[["h", t("unitH")], ["d", t("unitD")]].map(([k, l]) => (
                    <button key={k} onClick={() => setUnit(k)} style={{ flex: 1, padding: "5px 0", border: "none", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", background: unit === k ? "#38bdf8" : "rgba(255,255,255,0.08)", color: unit === k ? "#0f172a" : "#94a3b8" }}>{l}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input autoFocus type="number" step="0.5" value={tempPula} onChange={e => setTempPula(e.target.value)} onKeyDown={e => { if (e.key==="Enter") zatwierdzPule(); if (e.key==="Escape") setEditPula(false); }} onClick={e => e.stopPropagation()} style={{ width: "100%", background: "rgba(56,189,248,0.12)", border: "1px solid #38bdf8", borderRadius: 8, padding: "6px 8px", color: "#38bdf8", fontSize: 20, fontWeight: 800, outline: "none" }}/>
                  <button onClick={e => { e.stopPropagation(); zatwierdzPule(); }} style={{ background: "#38bdf8", border: "none", borderRadius: 8, padding: "7px 10px", color: "#0f172a", fontWeight: 800, cursor: "pointer" }}>✓</button>
                </div>
                <div style={{ fontSize: 10, color: "#64748b", marginTop: 6, lineHeight: 1.3 }}>{t("unitHint")}</div>
                </div>
              ) : (
                <div style={{ fontSize: 32, fontWeight: 800, color: "#38bdf8" }}>{pula}<span style={{ fontSize: 13, color: "#64748b", fontWeight: 400 }}> {u}</span></div>
              )}
            </div>
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 18, padding: "16px 14px" }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: "#64748b", textTransform: "uppercase", marginBottom: 8 }}>{t("used")}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#f59e0b" }}>{fmt(wykorzystane)}<span style={{ fontSize: 13, color: "#64748b", fontWeight: 400 }}> {u}</span></div>
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: "16px 18px", marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 10 }}>
              <span>{t("progress")}</span>
              <span style={{ color: progColor, fontWeight: 700 }}>{pct.toFixed(1)}%</span>
            </div>
            <div style={{ height: 10, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${progColor},${progColor}99)`, borderRadius: 99, transition: "width 0.7s ease" }}/>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "#475569" }}><span>0 {u}</span><span>{pula} {u}</span></div>
          </div>

          {wpisy.length > 0 && (
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, padding: "14px 18px" }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: 2 }}>{t("stats")}</div>
              {[[t("entriesCount"), wpisy.length], [t("approvedCount"), zatwierdzone.length]].map(([l,v]) => (
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
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{t("noEntries")}</div>
              <div style={{ fontSize: 13 }}>{t("noEntriesHint")}</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {wpisy.map(w => {
                const sc = STATUS_COLORS[w.status] || STATUS_COLORS["⏳ Oczekuje"];
                return (
                  <div key={w.id} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ flex: 1, paddingRight: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, fontSize: 15 }}>{w.opis || <span style={{ color: "#475569", fontStyle: "italic", fontWeight: 400 }}>{t("noDescription")}</span>}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{w.od ? `${formatDate(w.od)}${w.do && w.do !== w.od ? ` → ${formatDate(w.do)}` : ""}` : t("noDate")}</div>
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b", flexShrink: 0 }}>{w.godz}{u}</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ background: sc.bg, color: sc.text, borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 600 }}>{tStatus(w.status)}</span>
                      <div style={{ display: "flex", gap: 8 }}>
                        {w.od && <a href={gcalLink(w, unit)} target="_blank" rel="noopener noreferrer" title={t("addToCalendar")} style={{ background: "rgba(66,133,244,0.15)", borderRadius: 10, padding: "8px 12px", color: "#93c5fd", fontSize: 14, textDecoration: "none" }}>📅</a>}
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
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>{editId ? t("editEntry") : t("newEntry")}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 20 }}>{t("formHint")}</div>

            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>{t("amount", u)}</label>
              <input type="number" min="0.5" step="0.5" placeholder={t("amountPlaceholder", u)} value={form.godz} onChange={e => setForm(x => ({ ...x, godz: e.target.value }))} style={{ ...inp, fontSize: 28, fontWeight: 800, color: "#38bdf8", textAlign: "center", padding: "14px" }}/>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <div><label style={lbl}>{t("dateFrom")}</label><input type="date" value={form.od} onChange={e => setForm(x => ({ ...x, od: e.target.value }))} style={inp}/></div>
              <div><label style={lbl}>{t("dateTo")}</label><input type="date" value={form.do} onChange={e => setForm(x => ({ ...x, do: e.target.value }))} style={inp}/></div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>{t("description")}</label>
              <input type="text" placeholder={t("descriptionPlaceholder")} value={form.opis} onChange={e => setForm(x => ({ ...x, opis: e.target.value }))} style={inp}/>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={lbl}>{t("status")}</label>
              <div style={{ display: "flex", gap: 6 }}>
                {STATUSY.map(s => {
                  const sc = STATUS_COLORS[s]; const on = form.status === s;
                  return <button key={s} onClick={() => setForm(x => ({ ...x, status: s }))} style={{ flex: 1, padding: "10px 4px", border: "none", borderRadius: 12, background: on ? sc.bg : "rgba(255,255,255,0.07)", color: on ? sc.text : "#64748b", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>{tStatus(s)}</button>;
                })}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: 16, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, background: "transparent", color: "#64748b", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>{t("cancel")}</button>
              <button onClick={zapiszWpis} disabled={saving} style={{ flex: 2, padding: 16, border: "none", borderRadius: 16, background: saving ? "rgba(56,189,248,0.4)" : "linear-gradient(135deg,#38bdf8,#818cf8)", color: "#0f172a", fontSize: 15, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? t("saving") : editId ? t("save") : t("addEntry")}
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
