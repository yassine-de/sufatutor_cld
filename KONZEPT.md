TA3LIM – Konzept
TA3LIM ist eine Lernplattform für Marokko. Vorbild: sofatutor (Deutschland), angepasst an den marokkanischen Lehrplan. Umsetzung später mit Claude Code.
1. Zielgruppe
• Start: Grundschule, Klasse 1 bis 6
• Später: Mittelstufe (Collège) und Oberstufe (Lycée, Bac)
• Zahlende Kunden: Eltern; Nutzer: Kinder
• Erste Fächer (Vorschlag): Mathe, Arabisch, Französisch
2. Inhaltsstruktur nach sofatutor-Vorbild
• Hierarchie: Lehrplan → Klasse → Fach → Kapitel → Thema
• Pro Thema: kurzes Video, interaktive Übungen, Arbeitsblatt (PDF)
• Für Klasse 1–2: spielerischer, animierter Stil
• Lernfortschritt mit Belohnungen für Kinder
• Elternbereich mit Fortschrittsübersicht
• Später: Hausaufgaben-Chat mit echten Lehrern
3. Architektur-Grundsätze
1. Lehrplan als eigene Ebene: Lehrplan "Marokko" als Datensatz, damit später weitere Länder (Tunesien, Algerien) ohne Umbau möglich sind.
2. Mehrsprachigkeit ab Tag eins: Alle Texte in Arabisch, Französisch, optional Darija. Oberfläche muss Rechts-nach-links (RTL) unterstützen.
3. Familienkonten: Ein Elternkonto bezahlt und hat mehrere Kinderprofile. Fortschritt wird pro Kind und pro Thema/Übung gespeichert.
4. Abo und Zahlung getrennt: Eigene Tabellen für Pläne, Abos und Zahlungen, damit Preise und Zahlungsanbieter austauschbar sind.
4. Datenbank-Entwurf (erste Version)
• curricula: id, land, name, schuljahr_version
• grades (Klassen): id, curriculum_id, stufe (primaire/collège/lycée), nummer
• subjects (Fächer): id, curriculum_id, code
• chapters: id, grade_id, subject_id, reihenfolge
• topics (Themen): id, chapter_id, reihenfolge
• translations: entity_type, entity_id, sprache (ar/fr/darija), feld, text
• content_items: id, topic_id, typ (video/übung/arbeitsblatt), sprache, medien_url, dauer
• exercises: id, content_item_id, fragetyp, daten (JSON), lösung
• users: id, rolle (eltern/lehrer/admin), telefon, email, sprache
• child_profiles: id, parent_user_id, name, avatar, grade_id
• progress: child_id, content_item_id, status, punkte, zuletzt_am
• exercise_attempts: child_id, exercise_id, antwort, korrekt, zeitstempel
• rewards: child_id, typ, wert, erhalten_am
• plans: id, name, preis, währung (MAD), laufzeit
• subscriptions: id, user_id, plan_id, status, start, ende
• payments: id, subscription_id, anbieter, betrag, status, referenz
5. Offene Punkte
• Inhaltsproduktion: wer erstellt Videos und Übungen
• Preise und Zahlungswege in Marokko
• Marketing und Vertrieb
• Technologie-Stack (Web, App)
6. Nächste Schritte
1. MVP festlegen
2. Offiziellen Lehrplan (Bildungsministerium) für die MVP-Klassen beschaffen und in Kapitel/Themen zerlegen
3. Tech-Stack festlegen (Vorschlag: mobilfreundliche Web-App, z. B. Next.js + PostgreSQL)
4. Umsetzung mit Claude Code
5. Pilot mit 5–10 Familien in Marokko
7. MVP-Umfang (Entwurf)
Drin:
• Fach: Mathe, Klasse 1–3
• Sprache: Arabisch mit Darija-Erklärungen in den Videos (Unterrichtssprache im Lehrplan prüfen)
• Elternkonto mit bis zu 3 Kinderprofilen
• Themenübersicht nach Lehrplan: Klasse → Kapitel → Thema
• Pro Thema: ein Video und Übungen
• Übungstypen: Multiple Choice, Zahl eingeben, Zuordnen
• Fortschritt mit Sternen pro Thema
• Einfache Elternübersicht
• Admin-Bereich zum Einpflegen von Themen, Videos und Übungen
Später:
• Online-Zahlung (im Pilot kostenlos oder manuell)
• Hausaufgaben-Chat mit Lehrern
• Weitere Fächer und Klassen
• Native App
8. Auftrag für Claude Code: Lehrplan aufbereiten
1. Offizielles Dokument „المنهاج الدراسي للتعليم الابتدائي“ (finale Fassung Juli 2021, Lehrplan-Direktion des Bildungsministeriums) als PDF herunterladen, z. B. von tadrise.ma oder modarissi.com.
2. Den Mathe-Teil für Klasse 1–3 extrahieren.
3. Struktur aufbauen: Klasse → Kapitel/Einheit → Thema, mit Reihenfolge.
4. Jeden Titel auf Arabisch und Französisch hinterlegen.
5. Ergebnis als JSON und als Seed-Daten für die Tabellen curricula, grades, subjects, chapters, topics, translations ausgeben.
6. Prüfen und notieren, in welcher Sprache Mathe aktuell offiziell unterrichtet wird.
9. Technische Entscheidungen
• Tech-Stack: Next.js + PostgreSQL über Supabase (Login und Datenbank inklusive)
• Login: Eltern per Handynummer mit SMS- oder WhatsApp-Code
• Videos: externer Video-Dienst (z. B. Bunny Stream), optimiert für schwaches Mobilnetz
• Sprache: Eltern wählen pro Kind Arabisch oder Französisch; Oberfläche passt sich an, inkl. RTL
10. Eltern-Dashboard
• Fortschritt pro Kind: Themen abgeschlossen, Sterne, Quote richtiger Antworten
• Tagesübersicht: was das Kind heute gelernt hat (Themen, Videos, Übungen, Lernzeit)
• Wochenverlauf: Lernzeit und abgeschlossene Themen pro Tag
• Schwächen: Themen mit vielen Fehlern hervorheben
• Später: tägliche oder wöchentliche Zusammenfassung per WhatsApp
• Datenbasis: Tabellen progress, exercise_attempts, zusätzlich learning_sessions (child_id, start, ende, dauer)
11. Kinderprofile: Avatar oder eigenes Bild
• Jedes Kinderprofil hat ein eigenes Profilbild
• Standard: Auswahl aus einer Avatar-Galerie (kindgerechte, eigene Figuren)
• Optional: eigenes Foto hochladen, nur über das Elternkonto
• Fotos privat speichern (nicht öffentlich abrufbar), nur für die Familie sichtbar
• Datenbank: child_profiles erhält avatar_id (Verweis auf Tabelle avatars) und photo_url (optional)
12. Grundregel: so nah wie möglich an sofatutor
• sofatutor.com ist die Referenz für Aufbau, Navigation und Lernablauf. Vor jeder Funktion zuerst prüfen, wie sofatutor es löst, und das Prinzip übernehmen.
• Übernehmen: Struktur Fach → Klasse → Thema, Ablauf Video → Übungen → Arbeitsblatt, Belohnungssystem, Elternbereich, Abo-Logik.
• Nicht kopieren: Logo, Texte, Grafiken, Videos und Design-Elemente von sofatutor. Eigenes Design für TA3LIM.
13. Videoproduktion
• Erklärvideos als Motion Graphics, per Code von Claude Code erzeugt
• Werkzeuge: Remotion (Videos mit React) für Figuren und Szenen, Manim für Mathe-Animationen
• Einheitliche Vorlage pro Video: Intro, Erklärung, Beispiel, Zusammenfassung
• Jedes Video in Arabisch und Französisch (gleiche Animation, andere Texte und Tonspur)
• Offen: Stimme (Sprecher oder KI-Stimme), Remotion-Lizenzbedingungen prüfen