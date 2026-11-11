// Polish / English texts. Saved data stays the same in both languages
// (statuses are stored with their Polish names and only displayed translated).

const T = {
  pl: {
    appName: "Urlop",
    add: "+ Dodaj",
    tabHome: "📊 Podsumowanie",
    tabList: "📋 Wpisy",
    remaining: "Pozostało",
    unitsOf: (n, u) => `${u === "d" ? "dni" : "godzin"} z ${n}`,
    unitLabel: "Jednostka puli",
    unitH: "godziny",
    unitD: "dni",
    unitHint: "Zmiana nie przelicza wpisów, tylko zmienia podpis. Ustaw pulę i wpisy w wybranej jednostce.",
    pool: "Pula ✏️",
    used: "Zużyte",
    progress: "Postęp wykorzystania",
    stats: "Statystyki",
    entriesCount: "Liczba wpisów",
    approvedCount: "Zatwierdzonych",
    noEntries: "Brak wpisów",
    noEntriesHint: "Kliknij „+ Dodaj”, żeby dodać urlop",
    noDescription: "bez opisu",
    noDate: "Brak daty",
    addToCalendar: "Dodaj do Google Calendar",
    editEntry: "✏️ Edytuj wpis",
    newEntry: "🏖 Nowy wpis urlopowy",
    amount: u => u === "d" ? "Liczba dni *" : "Liczba godzin *",
    amountPlaceholder: u => u === "d" ? "np. 1 lub 0,5" : "np. 8",
    formHint: "📅 Podaj daty, a potem dodasz wpis do Google Calendar przyciskiem 📅 na liście",
    dateFrom: "Data od",
    dateTo: "Data do",
    description: "Opis",
    descriptionPlaceholder: "np. Urlop letni, Wizyta lekarska…",
    status: "Status",
    cancel: "Anuluj",
    saving: "⏳ Zapisywanie…",
    save: "Zapisz",
    addEntry: "Dodaj wpis",
    loadError: "❌ Nie udało się wczytać danych. Odśwież stronę.",
    calendarTitle: "Urlop",
    calendarDetails: (a, u) => `Urlop: ${a} ${u === "d" ? "dni" : "h"} (Urlop Tracker)`,
    statuses: { "✅ Zatwierdzone": "✅ Zatwierdzone", "⏳ Oczekuje": "⏳ Oczekuje", "❌ Odrzucone": "❌ Odrzucone" },
    // login / account
    loginIntro: "Zaloguj się, dane zapisują się w chmurze.",
    emailPlaceholder: "Twój email",
    sendLink: "Wyślij link logowania",
    sending: "⏳ Wysyłanie…",
    linkSent: email => <>📧 Wysłałem link na <b style={{ color: "#f1f5f9" }}>{email}</b>.<br />Otwórz go w tej samej przeglądarce, żeby się zalogować.</>,
    notInvited: "Ten email nie ma dostępu. Poproś właściciela aplikacji o zaproszenie.",
    loading: "Ładowanie…",
    saveError: "❌ Nie udało się zapisać w chmurze: ",
    exportBtn: "💾 Eksportuj dane do pliku",
    exportError: "eksport nie udał się: ",
    logout: "Wyloguj",
    missingConfig: "Brak konfiguracji Supabase. Ustaw zmienne VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY w Vercelu i zrób redeploy.",
  },
  en: {
    appName: "Holiday",
    add: "+ Add",
    tabHome: "📊 Summary",
    tabList: "📋 Entries",
    remaining: "Remaining",
    unitsOf: (n, u) => `${u === "d" ? "days" : "hours"} of ${n}`,
    unitLabel: "Allowance unit",
    unitH: "hours",
    unitD: "days",
    unitHint: "Changing the unit does not convert entries, it only changes the label. Set the allowance and entries in the unit you choose.",
    pool: "Allowance ✏️",
    used: "Used",
    progress: "Usage",
    stats: "Statistics",
    entriesCount: "Entries",
    approvedCount: "Approved",
    noEntries: "No entries",
    noEntriesHint: "Tap “+ Add” to add holiday",
    noDescription: "no description",
    noDate: "No date",
    addToCalendar: "Add to Google Calendar",
    editEntry: "✏️ Edit entry",
    newEntry: "🏖 New holiday entry",
    amount: u => u === "d" ? "Days *" : "Hours *",
    amountPlaceholder: u => u === "d" ? "e.g. 1 or 0.5" : "e.g. 8",
    formHint: "📅 Add dates, then use the 📅 button in the list to put it in Google Calendar",
    dateFrom: "From",
    dateTo: "To",
    description: "Description",
    descriptionPlaceholder: "e.g. Summer holiday, Doctor…",
    status: "Status",
    cancel: "Cancel",
    saving: "⏳ Saving…",
    save: "Save",
    addEntry: "Add entry",
    loadError: "❌ Could not load data. Refresh the page.",
    calendarTitle: "Holiday",
    calendarDetails: (a, u) => `Holiday: ${a} ${u === "d" ? "days" : "h"} (Urlop Tracker)`,
    statuses: { "✅ Zatwierdzone": "✅ Approved", "⏳ Oczekuje": "⏳ Pending", "❌ Odrzucone": "❌ Rejected" },
    loginIntro: "Sign in, your data is saved in the cloud.",
    emailPlaceholder: "Your email",
    sendLink: "Send login link",
    sending: "⏳ Sending…",
    linkSent: email => <>📧 Link sent to <b style={{ color: "#f1f5f9" }}>{email}</b>.<br />Open it in the same browser to sign in.</>,
    notInvited: "This email has no access. Ask the app owner for an invitation.",
    loading: "Loading…",
    saveError: "❌ Could not save to the cloud: ",
    exportBtn: "💾 Export data to file",
    exportError: "export failed: ",
    logout: "Log out",
    missingConfig: "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel and redeploy.",
  },
};

const KEY = "urlop-lang";

function initialLang() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "pl" || saved === "en") return saved;
  } catch {}
  return (navigator.language || "pl").toLowerCase().startsWith("pl") ? "pl" : "en";
}

let current = initialLang();

export const getLang = () => current;

export function setLang(lang) {
  current = lang === "en" ? "en" : "pl";
  try { localStorage.setItem(KEY, current); } catch {}
  document.documentElement.lang = current;
}

export function t(key, arg, arg2) {
  const v = T[current][key] ?? T.pl[key] ?? key;
  return typeof v === "function" ? v(arg, arg2) : v;
}

export const tStatus = s => T[current].statuses[s] || s;
