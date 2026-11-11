# 🏖 Urlop Tracker

Mobilna aplikacja do śledzenia godzin urlopowych.

## Stack
- React 18 + Vite
- Supabase (baza + logowanie linkiem na email)
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

Projekt Supabase: `urlop-tracker` (eu-west-2). Tabela z `supabase-setup.sql` jest już założona,
adres i publiczny klucz są w `supabase.js`.

Supabase → Authentication → URL Configuration → Site URL = adres z Vercela.

## Funkcje

- 📊 Podsumowanie z kółkiem postępu
- 📋 Lista wpisów urlopowych
- 📅 Przycisk „Dodaj do Google Calendar” przy wpisie (otwiera gotowe wydarzenie)
- 💾 Eksport danych do pliku JSON
- 💾 Dane zapisywane w Supabase (logowanie linkiem na email), przetrwają czyszczenie przeglądarki
- 📱 W pełni mobilna
- 🌍 Polski i angielski (przełącznik PL / EN na dole)

## Przyszłe plany

- [ ] Backend: Supabase + Make.com webhooks
- [ ] Powiadomienia push
- [ ] Multi-user (dla HR)
