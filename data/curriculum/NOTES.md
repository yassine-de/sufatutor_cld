# Lehrplan Mathe Klasse 1–3 (Marokko) – Notizen zu Phase 1

## Quelle
- Dokument: „المنهاج الدراسي للتعليم الابتدائي“, Final­fassung, Direction des curricula, Juli 2021 (556 Seiten).
- Datei: `source/curriculum_primaire_2021.pdf`, 60 460 790 Bytes, SHA-256 `4fc71e9d4f52c2de8188f878d2b02a54c4615e4402640ece804d18aa4e5fab0f`. PDF-Metadaten: erstellt 27.07.2021 (Adobe PDF Library).
- **Herkunft:** Die offizielle URL (`men.gov.ma/Ar/Documents/Curriculum _Primaire_2021 Final 28 juillet.pdf`) und `ostad.ma` waren von hier nicht erreichbar (Verbindung abgebrochen bzw. DNS-Fehler). Geladen wurde die gleichnamige Datei von einem MediaFire-Mirror, den educaprof.com verlinkt. Inhalt und Metadaten passen zur Ministeriumsfassung, ein Byte-Vergleich mit dem Original war aber nicht möglich.
- Seitenangaben unten: **gedruckte Seitenzahl** (Fußzeile); der PDF-Index ist jeweils um 1 kleiner.

## Unterrichtssprache Mathe (Aufgabe 6)
- Mathe wird in der Grundschule **auf Arabisch** unterrichtet (S. 277: „تدرس الرياضيات بالمدرسة الابتدائية باللغة العربية“).
- Einzelne Aktivitäten dürfen in einer Fremdsprache stattfinden, im Rahmen der **Vorbereitung auf den Sprachwechsel** („التهيئة للتناوب اللغوي“, S. 277 und 282; rechtlicher Bezug: Rahmengesetz 51.17, Art. 31). Der Wechsel selbst (Mathe/Naturwissenschaften auf Französisch) ist Teil der Reform, für die Grundschule aber nur vorbereitend vorgesehen.
- **Wichtig für den MVP:** Dasselbe Prinzip verlangt „مع تجنب الخطاب الدارج العامي“ – also **Umgangssprache (Darija) vermeiden**, Mathe-Sprache soll korrektes Arabisch bzw. Französisch sein (S. 277). Das widerspricht dem Konzept-Punkt „Arabisch mit Darija-Erklärungen in den Videos“. Das Konzept sollte hier angepasst oder bewusst begründet abgewichen werden.

## Struktur und Modellierung
- Der Lehrplan gliedert pro Jahr in 4 Bereiche (Zahlen und Rechnen, Geometrie, Messen, Daten) und gibt in der „Jahresverteilung“ (التوزيع السنوي, 2 Semester × je 17 Wochen) 6 Einheiten (الوحدات) mit Wochenthemen an. Diese Verteilung wird übernommen:
  - **Kapitel** = Einheit (6 pro Klasse, 3 pro Semester). Der Lehrplan nummeriert nur („الوحدة 1“), Namen gibt es nicht. Der beschreibende Kapiteltitel ist **von uns abgeleitet** (`quality = derived`).
  - **Thema** = Wochenthema; Reihenfolge nach Woche, bei mehreren Themen in einer Woche nach Spalte (Zahlen, Geometrie, Messen, Daten).
  - Je Thema ist der Bereich (`domain` N/G/M/D) und die Woche im JSON hinterlegt.
- Nicht als Themen aufgenommen: Woche 1 (Einstieg/Diagnose), die „Evaluation und Förderung“-Wochen je Einheit (im JSON als `review_week` am Kapitel, gut als spätere Kapiteltests nutzbar), Woche 17 und 33 (Semesterwiederholung), Woche 34 (Schuljahresende).
- Ergebnis: 1 Lehrplan, 1 Fach, 3 Klassen, 18 Kapitel, 96 Themen, 274 Übersetzungen.
- **Nicht** enthalten: die detaillierten Lernziele je Bereich (S. 296–311, jeweils vor der Jahresverteilung), Wochenstunden, Kompetenzen. Sie liegen im PDF und lassen sich später als Beschreibung je Thema ergänzen.

## Qualität der Texte
- Arabisch: Die Textebene des PDFs ist durch Schrift-Kodierung stark beschädigt (vertauschte Buchstaben, eingestreute Ziffern). Die Titel wurden deshalb aus den **gerenderten Seiten** gelesen und mit der Textebene abgeglichen, nicht aus dem Rohtext übernommen. Stichprobe empfohlen.
- Französisch: **eigene Übersetzung** in der üblichen Schulterminologie, in der DB als `unreviewed` markiert. Muttersprachler-Prüfung nötig. Unsicher: „القن“ (S. 307, Klasse 2, Woche 19) wurde im Französischen weggelassen.
- Quellenfehler: Klasse 1, Woche 23 nennt im Plan „von 51 bis 50“. Aus dem Lehrplantext (S. 297) ist klar „51 bis 99“; so wurde es übernommen.
- Seiten der Jahresverteilung: Klasse 1 S. 300–301, Klasse 2 S. 306–307, Klasse 3 S. 312–313.

## Dateien
- `curriculum.json` – Hierarchie mit Übersetzungen, Bereich, Woche, Semester.
- `../../supabase/seed.sql` – Insert-Skript für curricula, subjects, grades, chapters, topics, translations und den Pilot-Tarif (Transaktion, deterministische UUIDs v5). Wird von `build.py` erzeugt, nicht von Hand ändern.
- `build.py` erzeugt beide Dateien, `validate.py` prüft sie. Die Daten stehen in `build.py`.

## Schema (Phase 2, umgesetzt)
Die Vorschläge aus Phase 1 sind in `supabase/migrations` übernommen: `slug` an curricula/chapters/topics, `translations.quality`, `topics.domain`, `topics.week`, `chapters.semester`, `chapters.review_week`, UUIDs als IDs. Der Klassenname steht in `translations` (`entity_type = 'grade'`, `feld = 'name'`).
