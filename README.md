# TA3LIM

Lernplattform für Marokko nach dem Vorbild von sofatutor, angepasst an den marokkanischen Lehrplan.
Konzept: [KONZEPT.md](KONZEPT.md).

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind 4), mobilfreundlich
- Supabase (PostgreSQL, Auth, Storage)
- Oberfläche auf Arabisch (RTL) und Französisch (LTR), Routen `/ar` und `/fr`

## Struktur

| Pfad | Inhalt |
| --- | --- |
| `src/app/[lang]` | Seiten, `<html lang dir>` wird je Sprache gesetzt |
| `src/i18n` | Sprachen, JSON-Wörterbücher für die Oberfläche |
| `src/proxy.ts` | Leitet `/` auf die passende Sprache um (Cookie, dann Accept-Language, sonst Arabisch) |
| `src/lib/supabase` | Browser- und Server-Client |
| `supabase/migrations` | Datenbankschema und Zugriffsregeln (RLS) |
| `supabase/seed.sql` | Lehrplan Mathe Klasse 1–3 und Pilot-Tarif, **generiert** |
| `data/curriculum` | Lehrplan-Quelle, Generator und Notizen ([NOTES.md](data/curriculum/NOTES.md)) |
| `scripts/db-test.mjs` | Datenbanktest ohne Docker (PGlite) |
| `public/avatars` | Avatar-Galerie (eigene SVG-Figuren) |

## Entwickeln

```bash
npm install
cp .env.example .env.local   # Supabase-URL und Keys eintragen
npm run dev
```

Datenbank lokal (braucht Docker): `npx supabase start`, dann `npx supabase db reset` spielt Migrationen und Seed ein.
Ohne Docker prüft `npm run db:test` Schema, Seed und Zugriffsregeln in einem eingebetteten Postgres.

Seed neu erzeugen, wenn sich `data/curriculum/build.py` ändert: `npm run seed:build`.

## Anmeldung und Familienkonto

- Eltern melden sich **nur mit der Handynummer** an: Nummer eingeben, 6-stelligen Code per SMS erhalten, fertig (`/login`). Marokkanische Nummern dürfen national getippt werden (`06…`, `07…`), Nummern aus dem Ausland brauchen das `+`.
- Danach wählt das Kind sein Profil (`/profiles`, wie bei Streamingdiensten). Eltern verwalten Profile unter `/profiles/manage`: Name, Klasse, Lernsprache (Arabisch oder Französisch), Avatar **oder** eigenes Foto. Maximal 3 Profile, abhängig vom Tarif.
- Fotos werden vor dem Hochladen quadratisch auf 512 px verkleinert (spart Datenvolumen, entfernt EXIF/GPS) und landen im **privaten** Bucket `child-photos` unter `<Eltern-ID>/…`. Angezeigt werden sie nur über kurzlebige signierte URLs.
- Der Proxy leitet nicht angemeldete Besucher von `/profiles`, `/account` und `/learn` auf `/login` um. Das ist nur eine Vorprüfung, jede Seite und Aktion prüft den Nutzer erneut.

### SMS einrichten

Lokal (`supabase start`) funktionieren die Testnummern aus `supabase/config.toml` (`0600000001`, `0600000002`, Code `123456`) ohne SMS-Anbieter. Für echte SMS braucht Supabase einen Anbieter (Twilio, MessageBird, Vonage, Textlocal): im Dashboard unter Authentication → Providers → Phone eintragen, die Testnummern entfernen. Für Marokko vorher prüfen, ob der Anbieter Zustellung an marokkanische Netze (Maroc Telecom, Orange, inwi) und eine Absenderkennung unterstützt. **WhatsApp-Codes** sind in Supabase nicht eingebaut und wären eine spätere Erweiterung (z. B. über einen Auth-Hook).

## Lernbereich

Ablauf wie bei sofatutor, mit eigenem Design: Fach → Klasse → Kapitel → Thema → Video → Übungen → Arbeitsblatt.

- `/learn`: Fächer (nur Mathe), `/learn/math/<klasse>`: Kapitel und Themen mit Sternen, `/learn/topic/<slug>`: Video, Übungen, Arbeitsblatt, `/learn/topic/<slug>/practice`: Übungen.
- Inhalte kommen in der Lernsprache des Kindes (`child_profiles.sprache`), die Oberfläche in der Sprache der URL.
- Übungstypen: Multiple Choice, Zahl eingeben (auch mit arabisch-indischen Ziffern), Zuordnen. Die Lösung bleibt in der Datenbank, `submit_attempt()` meldet nur richtig oder falsch.
- Sterne: `finish_topic_practice()` bewertet die letzte Antwort je Übung: ab 90 % 3 Sterne, ab 70 % 2, ab 50 % 1. Sterne sinken nie, ein Thema gilt ab 1 Stern als abgeschlossen.
- Lernzeit: Solange eine Lernseite sichtbar ist, meldet `track_learning()` alle 30 Sekunden Aktivität. Pausen unter 5 Minuten gehören zur selben Sitzung (Basis für das Eltern-Dashboard).
- Videos: Bunny-Stream-Links (`iframe.mediadelivery.net`) oder direkte `.mp4`/`.webm`-HTTPS-Links. Arbeitsblätter liegen im privaten Bucket `worksheets` (signierter Link).
- **Demo-Inhalte:** `supabase/demo-content.sql` legt für zwei Themen von Klasse 1 Übungen auf Arabisch und Französisch an. Es wird nur lokal geladen (`config.toml`) und gehört nicht in ein echtes Projekt.

## Eltern-Dashboard und Admin

- `/dashboard`: je Kind Sterne, abgeschlossene Themen, Quote richtiger Antworten, Tagesübersicht, Wochendiagramm (Lernminuten, mit Tabellenansicht) und Schwächen (Themen mit vielen Fehlern, ab 3 Antworten).
- `/admin` (nur Rolle `admin`, sonst 404): Inhaltsübersicht je Klasse mit Status von Video, Übungen und Arbeitsblatt in Arabisch und Französisch; Thema anlegen, Titel, Video-Link, PDF-Upload, Übungen (3 Typen) bearbeiten und veröffentlichen; `/admin/translations`: Übersetzungen prüfen (Status `reviewed`).
- Den ersten Admin setzt man per SQL: `update public.users set rolle = 'admin' where telefon = '+212...';`
- Lösungen liest der Admin-Editor über `admin_exercise()`, dafür wird kein Service-Role-Key im Browser oder in der App gebraucht.

## Datenmodell in Kürze

- Lehrplan: `curricula` → `grades` → `subjects` → `chapters` → `topics`; alle Texte in `translations` (ar, fr, darija) mit Prüfstatus `quality`.
- Inhalte: `content_items` (Video, Übungen, Arbeitsblatt je Thema und Sprache), `exercises` (JSON je Fragetyp, Lösung nie für Clients lesbar; Prüfung über `submit_attempt()`).
- Familie: `users` (Rolle, Telefon) → `child_profiles` (Avatar oder privates Foto, Sprache, Klasse), maximal 3 Profile, abhängig vom Tarif.
- Lernen: `progress`, `topic_progress` (Sterne), `exercise_attempts`, `rewards`, `learning_sessions`; Elternansichten `v_child_overview`, `v_child_daily`, `v_child_topic_errors`.
- Abo und Zahlung getrennt: `plans`, `subscriptions`, `payments` (nur serverseitig beschreibbar).
- Zugriff: Lehrplan und Pläne öffentlich lesbar, Familiendaten nur für das Elternkonto, Inhalte nur eingeloggt und veröffentlicht, Verwaltung nur Rolle `admin`.
