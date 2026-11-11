# 🏖 Urlop Tracker

Mobilna aplikacja do śledzenia godzin urlopowych, zintegrowana z Google Calendar.

## Stack
- React 18 + Vite
- Anthropic API (Google Calendar MCP)
- Vercel (hosting)

## Uruchomienie lokalne

```bash
npm install
npm run dev
```

## Deploy na Vercel

1. Wrzuć repo na GitHub
2. Wejdź na [vercel.com](https://vercel.com) → "Add New Project"
3. Wybierz to repo → kliknij **Deploy**
4. Gotowe — Vercel sam wykrywa Vite

## Supabase (zapis danych)

1. Supabase → SQL Editor → wklej `supabase-setup.sql` → Run
2. Supabase → Authentication → URL Configuration → Site URL = adres z Vercela
3. Vercel → Settings → Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` → Redeploy

## Funkcje

- 📊 Podsumowanie z kółkiem postępu
- 📋 Lista wpisów urlopowych
- 📅 Synchronizacja z Google Calendar (import + tworzenie wydarzeń)
- 💾 Dane zapisywane w Supabase (logowanie linkiem na email), przetrwają czyszczenie przeglądarki
- 📱 W pełni mobilna

## Przyszłe plany

- [ ] Backend: Supabase + Make.com webhooks
- [ ] Powiadomienia push
- [ ] Multi-user (dla HR)
