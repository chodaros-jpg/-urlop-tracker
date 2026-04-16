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

## Funkcje

- 📊 Podsumowanie z kółkiem postępu
- 📋 Lista wpisów urlopowych
- 📅 Synchronizacja z Google Calendar (import + tworzenie wydarzeń)
- 💾 Dane zapisywane lokalnie w przeglądarce
- 📱 W pełni mobilna

## Przyszłe plany

- [ ] Backend: Supabase + Make.com webhooks
- [ ] Powiadomienia push
- [ ] Multi-user (dla HR)
