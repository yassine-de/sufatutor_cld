# TA3LIM – Stand und Weiterarbeit auf einem anderen Rechner

Lernplattform für Marokko nach dem Vorbild von sofatutor. Konzept: [KONZEPT.md](KONZEPT.md), Überblick: [README.md](README.md).

## Stand

Alle fünf Phasen sind gebaut. Lint, Typecheck, Build, 5 Tests (Telefonnummern) und 32 Datenbanktests laufen.
**Nie getestet wurde der Ablauf gegen eine echte Supabase-Instanz** (kein Docker, kein SMS-Anbieter auf dem Entwicklungsrechner). Login per SMS, Foto-Upload, Lernbereich, Dashboard und Admin sind nur gebaut, nicht am Stück durchgespielt.

| Phase | Inhalt | Wo |
| --- | --- | --- |
| 1 Lehrplan | Mathe Klasse 1–3, Arabisch und Französisch, 18 Kapitel, 96 Themen | `data/curriculum`, `supabase/seed.sql` |
| 2 Setup | Next.js 16, Supabase-Schema, RLS, i18n, RTL | `src/`, `supabase/migrations` |
| 3 Login | Handynummer + SMS-Code, Elternkonto, Kinderprofile mit Avatar oder privatem Foto | `src/app/[lang]/login`, `(app)/profiles` |
| 4 Lernen | Fach, Klasse, Kapitel, Thema, Video, Übungen (3 Typen), Sterne, Lernzeit | `(app)/learn` |
| 5 Eltern/Admin | Dashboard, Admin für Themen, Videos, Arbeitsblätter, Übungen, Übersetzungen | `(app)/dashboard`, `(app)/admin` |

## Auf dem neuen Rechner starten

Voraussetzungen: Node.js 24, Python 3 (nur für den Seed-Generator), optional Docker.

```bash
git clone https://github.com/yassine-de/sufatutor_cld.git
cd sufatutor_cld
npm install
cp .env.example .env.local     # Supabase-URL und Keys eintragen
npm run dev
```

Prüfen ohne Docker und ohne Supabase:

```bash
npm run lint
npx tsc --noEmit
npm test            # Telefonnummern
npm run db:test     # Schema, Seed, Zugriffsregeln in einem eingebetteten Postgres (PGlite)
npm run build
```

Wichtig für Claude Code: Next 16 hat Änderungen gegenüber älteren Versionen (`proxy.ts` statt Middleware, Cache Components, `next/root-params`). Vor Code die Doku in `node_modules/next/dist/docs/` lesen (siehe `AGENTS.md`).

## Nächster Schritt: echter Durchlauf mit Supabase

1. **Supabase bereitstellen**: lokal mit Docker (`npx supabase start`, dann `npx supabase db reset` spielt Migrationen, Seed und Demo-Inhalte ein) oder ein Cloud-Projekt (Migrationen aus `supabase/migrations` einspielen, `supabase/seed.sql` ausführen, **nicht** `demo-content.sql`).
2. **Schlüssel eintragen** in `.env.local` (siehe `.env.example`).
3. **SMS**: Lokal gelten die Testnummern aus `supabase/config.toml` (`0600000001`, `0600000002`, Code `123456`). Für echte Nutzer braucht Supabase einen SMS-Anbieter; vorher prüfen, ob er marokkanische Netze beliefert. WhatsApp-Codes sind in Supabase nicht eingebaut.
4. **Ersten Admin setzen** (nach der ersten Anmeldung): `update public.users set rolle = 'admin' where telefon = '+212…';`
5. **Alles einmal durchspielen**: anmelden, Kind anlegen (mit Foto), lernen, Übung lösen, Dashboard ansehen, im Admin ein Thema bearbeiten. Dabei auftretende Fehler beheben; hier ist am ehesten Nacharbeit nötig.

## Offene Punkte

- Echte Inhalte fehlen: keine Videos, nur Demo-Übungen für zwei Themen (`supabase/demo-content.sql`, nur lokal).
- **Darija in den Videos widerspricht dem Lehrplan**: Er verlangt, Umgangssprache zu vermeiden (S. 277 des Lehrplans, Details in `data/curriculum/NOTES.md`). Das Konzept muss hier entscheiden.
- Französische Titel sind eigene Übersetzungen (Status `unreviewed`); Muttersprachler-Prüfung im Admin unter `/admin/translations`.
- Kein PIN-Schutz für den Elternbereich auf einem Gerät, das ein Kind benutzt.
- Keine Einwilligung (Datenschutz, Nutzungsbedingungen), obwohl Kinderfotos gespeichert werden; rechtlich klären.
- Kapitel lassen sich im Admin nicht anlegen (nur Themen), sie stammen aus dem offiziellen Lehrplan.
- Hochgeladene Fotos können liegen bleiben, wenn die Seite vor dem Speichern geschlossen wird.
- Noch nicht gebaut: Online-Zahlung (Tabellen sind da), WhatsApp-Zusammenfassung, Hausaufgaben-Chat, weitere Fächer und Klassen, Videoproduktion (Remotion/Manim), Native App.
- TypeScript-Typen der Datenbank (`supabase gen types`) sind noch handgeschrieben, sobald ein Projekt läuft ersetzen.

## Lehrplan-Quelle

Das Original-PDF (60 MB) ist **nicht im Repository** (`data/curriculum/source/` ist ignoriert). Quelle, Prüfsumme und Seitenangaben stehen in `data/curriculum/NOTES.md`. Der Seed lässt sich ohne das PDF neu erzeugen: `npm run seed:build`.

## Wichtige Entscheidungen

- Eltern zahlen und melden sich per Handynummer an; Kinder sind Profile im Elternkonto (kein eigener Login).
- Antworten werden serverseitig geprüft (`submit_attempt`), die Lösung ist für Clients nie lesbar.
- Fotos privat, nur über signierte URLs, vor dem Hochladen verkleinert.
- Abo und Zahlung sind eigene Tabellen und nur serverseitig beschreibbar.
- Eigenes Design und eigene Avatare; nichts von sofatutor kopiert.
