[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

# FirefoxNewTab

Eine schlanke Firefox-Erweiterung für neue Tabs mit Website-Verknüpfungen, Gruppen, eigenen Hintergründen und einer optionalen Uhr. Sie verwendet Manifest V3 sowie HTML, CSS und JavaScript ohne zusätzliche Bibliotheken und läuft direkt aus den Quelldateien, ohne Installation von Abhängigkeiten oder Build-Schritt.

## Funktionen

- Website-Verknüpfungen per Ziehen in einem Raster mit vier Symbolgrößen anordnen und auch freie Felder speichern.
- Websites in einer einklappbaren Gruppen-Seitenleiste organisieren und Verknüpfungen zwischen Gruppen verschieben.
- Eigene Symbole hochladen oder bei Bedarf direkt von einer Website abrufen.
- Aus 7 mitgelieferten Hintergrundbildern, einem lokalen Bild oder 48 Hintergrundfarben wählen.
- Ein dunkles, helles oder dem System folgendes Design verwenden und bei Bedarf lokale Uhrzeit und Datum anzeigen.
- Die Oberflächensprache automatisch an Firefox anpassen und die Systemeinstellung für reduzierte Bewegung beachten.

## In Firefox laden

Zum Abrufen von Website-Symbolen ist Firefox 128 oder neuer erforderlich, da diese Funktion [`optional_host_permissions`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/optional_host_permissions) verwendet.

1. Dieses Repository herunterladen oder klonen und die Dateistruktur beibehalten.
2. In Firefox `about:debugging#/runtime/this-firefox` öffnen.
3. Auf **Temporäres Add-on laden…** klicken und `manifest.json` im Projektverzeichnis auswählen.
4. Falls Firefox nachfragt, das Ersetzen der Seite für neue Tabs erlauben.
5. Einen neuen Tab öffnen. Per Rechtsklick auf eine freie Fläche die erste Website hinzufügen oder über das Zahnrad unten rechts die Einstellungen öffnen.

Die temporäre Installation endet beim Neustart von Firefox; anschließend muss die Erweiterung erneut geladen werden. Siehe [Mozillas Anleitung zur temporären Installation](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/).

## Website-Verknüpfungen

### Websites hinzufügen und verwalten

Die Website-Liste ist anfangs leer. Ein Rechtsklick auf eine freie Hintergrundfläche öffnet diese Aktionen:

| Aktion | Ergebnis |
| --- | --- |
| Symbol hinzufügen | Eine Website zur aktuellen Gruppe hinzufügen. |
| Hintergrundbild ändern | Die Einstellungen bei den mitgelieferten Hintergrundbildern öffnen. |
| Einstellungen | Den Einstellungsbereich öffnen. |

Namen dürfen bis zu 50 Zeichen lang sein. Adressen müssen HTTP oder HTTPS verwenden; ohne Protokoll wird automatisch `https://` ergänzt. Ein Klick auf eine Verknüpfung öffnet die Website im aktuellen Tab.

Per Rechtsklick oder über die Schaltfläche mit den drei Punkten lassen sich Verknüpfungen öffnen, bearbeiten, vergrößern, verkleinern oder löschen. Die Schaltfläche erscheint beim Darüberfahren oder bei Tastaturfokus und bleibt auf Touch-Geräten sichtbar. Löschen erfordert eine Bestätigung; beim Abbrechen der Bearbeitung werden ungespeicherte Änderungen verworfen.

### Symbolgrößen und Rasterkapazität

Jede Gruppe besitzt ein logisches Desktop-Raster mit **10 Spalten × 6 Zeilen**, insgesamt **60 Grundfeldern**.

| Größe | Spalten × Zeilen | Grundfelder |
| --- | --- | --- |
| Normal | 1 × 1 | 1 |
| Breites Symbol | 2 × 1 | 2 |
| Hohes Symbol | 1 × 2 | 2 |
| Großes Symbol | 2 × 2 | 4 |

Eine Gruppe fasst bis zu 60 Verknüpfungen in normaler Größe. Größere Symbole benötigen zusätzlich passend angeordnete freie Felder. Bei einer vollen Gruppe wird das Hinzufügen deaktiviert. Hinzufügen, Verschieben zwischen Gruppen und Größenänderungen prüfen jeweils den verfügbaren Platz. Die Größe wird für jede Website einzeln gespeichert.

Verknüpfungen lassen sich auf freie Felder oder auf andere Verknüpfungen ziehen, die dann ausweichen. Positionen und Lücken werden gespeichert. Mit **Esc** oder durch Abbrechen des Ziehens wird die ursprüngliche Anordnung wiederhergestellt. Ziehen nahe dem Rand des Scrollbereichs macht weitere Felder erreichbar.

Das Raster bleibt oben links im Bereich neben der Seitenleiste ausgerichtet und scrollt nur bei Bedarf. Schmale Fenster verwenden weniger Spalten und speichern für jede Spaltenanzahl eigene Positionen. Verschieben in einer schmalen Ansicht überschreibt keine Desktop-Positionen; allein das Ändern der Fenstergröße speichert keine neuen Positionen. In einer einspaltigen Ansicht werden breite Symbole vorübergehend schmaler und erhalten bei ausreichend Platz ihre ursprüngliche Breite zurück.

### Gruppen

Die Seitenleiste enthält anfangs die Gruppe **Favoriten**. Über **Gruppe hinzufügen** lassen sich weitere Gruppen mit Namen von bis zu 20 Zeichen erstellen. In den Gruppeneinstellungen können der Name und ein Symbol aus Text, einem Emoji oder einem lokalen Bild festgelegt werden.

Eine Website lässt sich durch Ziehen auf eine Gruppe dorthin verschieben. Bei eingeklappter Seitenleiste genügt das Gruppensymbol als Ziel. Reicht der Platz in der Zielgruppe nicht aus, bleibt die Website an ihrer ursprünglichen Position.

Der Pfeil oben klappt die Seitenleiste ein oder aus. Die aktuelle Gruppe und der eingeklappte Zustand werden gespeichert. Jede Gruppe, auch die anfängliche, kann umbenannt oder gelöscht werden; mindestens eine muss jedoch bestehen bleiben. Beim Löschen einer Gruppe werden ihre Websites und Symbole in die erste verbleibende Gruppe verschoben.

Gruppenwechsel verwenden vertikale Animationen entsprechend der Reihenfolge in der Seitenleiste. Größenänderungen und das Ein- und Ausklappen der Seitenleiste werden ebenfalls weich animiert. Diese Effekte beachten die Systemeinstellung für reduzierte Bewegung.

### Eigene und abgerufene Symbole

- Für Website- und Gruppensymbole können PNG-, JPEG-, WebP-, GIF-, AVIF- oder ICO-Dateien mit bis zu **2 MiB** hochgeladen werden.
- Ohne eigenes Website-Symbol wird der erste Buchstabe des Namens angezeigt. **Standardsymbol verwenden** stellt diese Darstellung wieder her.
- Symbole behalten ihr Seitenverhältnis, werden nie hochskaliert und auf höchstens **512 px** an der längsten Seite verkleinert. Sie werden mit ungefähr **0,8** Qualität als WebP komprimiert und bei Bedarf weiter verkleinert, um die Grenze von **128 KiB** gespeicherten Symboldaten einzuhalten.
- Bereits gespeicherte PNG-Symbole bleiben kompatibel. Für ein früher auf 128 px komprimiertes Symbol muss das Original erneut hochgeladen oder das Symbol erneut abgerufen werden, um die Schärfe zu verbessern.

Nach Eingabe der Website-Adresse auf **Symbol abrufen** klicken. Firefox fragt bei Bedarf nach der Zugriffsberechtigung für diese Website. Die Erweiterung liest die von der Website angegebenen Symbole und versucht auch `/favicon.ico`; anschließend wird das Ergebnis in eine lokale Vorschau umgewandelt. Erst **Speichern** übernimmt das Symbol. Bei Fehlern oder verweigerter Berechtigung bleibt das bisherige Symbol erhalten, und lokale Bilder können weiterhin hochgeladen werden. Es wird kein externer Symboldienst verwendet.

## Darstellung und Hintergründe

Das Zahnrad unten rechts öffnet den Einstellungsbereich. Er lässt sich über die Schließen-Schaltfläche, einen Klick außerhalb oder mit **Esc** schließen.

| Einstellung | Optionen und Verhalten |
| --- | --- |
| Design | **Dunkel**, **Hell** oder **Systemeinstellung folgen**; standardmäßig wird dem System gefolgt. |
| Uhr anzeigen | Standardmäßig aus. Zeigt die lokale Zeit im 24-Stunden-Format `HH:mm:ss` und ein sprachabhängig formatiertes Datum; Aktualisierung jede Sekunde. |
| Mitgelieferte Hintergrundbilder | 7 Bilder in zwei Spalten; ein Klick auf ein Vorschaubild wendet es an und speichert es. |
| Lokales Hintergrundbild | PNG, JPEG, WebP, GIF oder AVIF mit bis zu **10 MiB**; wird nach Auswahl angewendet und gespeichert. |
| Hintergrundfarben | 48 Farben; ein Klick auf ein Farbfeld wendet die Farbe an und speichert sie. |
| Standardhintergrund | Weiß (`#ffffff`), beim ersten Start und beim Zurücksetzen auf den Standard. |

Das Design ändert Bedienelemente, Menüs und Dialoge; das gewählte Hintergrundbild oder die Hintergrundfarbe bleibt erhalten. Auf hellen einfarbigen Hintergründen erscheinen Website-Titel und Uhr in dunkler Schrift. Design, Sichtbarkeit der Uhr und eingeklappte Seitenleiste werden zwischen geöffneten neuen Tabs derselben Erweiterung synchronisiert.

## Oberflächensprache

Die Oberfläche folgt der Anzeigesprache von Firefox über [`browser.i18n.getUILanguage()`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/i18n/getUILanguage). Es gibt keine separate Sprachauswahl.

Unterstützt werden vereinfachtes und traditionelles Chinesisch, Englisch, Japanisch, Koreanisch, Spanisch, Französisch, Deutsch und Portugiesisch mit Varianten für Brasilien und Portugal. Regionale Spracheinstellungen verwenden passende oder allgemeine Übersetzungen; für nicht unterstützte Sprachen wird vereinfachtes Chinesisch verwendet. Nach einem Wechsel der Firefox-Anzeigesprache einen neuen Tab öffnen.

Menüs, Einstellungen, Dialoge, Meldungen, Beschriftungen für Barrierefreiheit, Farbnamen, Erweiterungsname, Datum und der Standardgruppenname sind übersetzt. Vom Benutzer eingegebene Website-Titel, URLs und Gruppennamen behalten ihren ursprünglichen Text. Die Uhr verwendet immer die lokale Zeitzone.

## Lokale Daten und Berechtigungen

| Speicher | Inhalt |
| --- | --- |
| `localStorage` | Websites, Symbole, Rasterpositionen, Gruppen, aktuelle Gruppe, Seitenleistenstatus, Design und Sichtbarkeit der Uhr. |
| `IndexedDB` | Hintergrundauswahl und lokale Hintergrundbilder. |

Hochgeladene Bilder bleiben im Browser. Zum Verwalten von Verknüpfungen und Hintergründen sind keine zusätzlichen Berechtigungen nötig. Website-Zugriff wird nur beim Klick auf **Symbol abrufen** angefordert; eine Ablehnung verhindert keine lokalen Uploads. Hintergründe verwenden keinen externen Bilddienst. Ist der lokale Speicher nicht verfügbar, melden Verwaltungsaktionen einen Fehler.

### Kompatibilität mit älteren Daten

- Frühere mitgelieferte Verknüpfungen werden anhand ihrer Vorgabemarkierungen entfernt; selbst hinzugefügte Websites und eigene Symbole bleiben erhalten.
- Die frühere Ordnerfunktion wurde entfernt. Websites aus alten Ordnern wechseln unter Beibehaltung von Namen, URLs, Symbolen und Größen in das Hauptraster ihrer Gruppe.
- Überschreiten ältere Daten die Rasterkapazität, bleiben zusätzliche Websites in der Liste **Weitere Websites** verfügbar. Dort können sie geöffnet, bearbeitet oder gelöscht werden. Sobald Platz frei wird, kehren sie ins Raster zurück.

## Entwicklung

### Projektstruktur

| Dateien | Aufgabe |
| --- | --- |
| `manifest.json` | Erweiterungsdaten, Ersetzen neuer Tabs und optionale Website-Berechtigungen. |
| `newtab.html`, `newtab.css`, `newtab.js` | Seitenstruktur, Grundgestaltung, Uhr und Datum. |
| `i18n.js`, `_locales/` | Übersetzungen der Oberfläche und WebExtension-Nachrichtenkataloge. |
| `shortcuts.js`, `groups.js`, `sidebar.js` | Website-Verwaltung, Gruppen und Seitenleistenstatus. |
| `shortcut-layout.js`, `shortcut-grid.js` | Rasterkapazität, Platzierungsregeln, Messungen und Ziehen. |
| `shortcut-tile-motion.js`, `shortcut-page-transition.js` | Animationen für Symbolgrößen und Gruppenwechsel. |
| `shortcut-menu.js`, `background-menu.js` | Kontextmenüs für Verknüpfungen und Hintergrund. |
| `icon-utils.js`, `shortcut-icon-fetcher.js` | Gemeinsame Symbolverarbeitung und Abrufen von Website-Symbolen bei Bedarf. |
| `shortcut-migrations.js` | Kompatibilität mit älteren gespeicherten Website-Daten. |
| `background.js`, `background-presets.js`, `assets/` | Hintergrundspeicher, Liste mitgelieferter Hintergrundbilder und Bilder. |
| `settings.js` | Einstellungsbereich, Design und Uhreinstellungen. |
| `wallpaper-picker.css`, `sidebar.css`, `ui-effects.css`, `shortcut-board.css` | Gestaltung von Hintergrundauswahl, Seitenleiste, Interaktionseffekten und Raster. |
| `README*.md`, `LICENSE` | Dokumentation in 8 Sprachen und Lizenztext. |

### Bearbeiten und neu laden

Es müssen weder Abhängigkeiten installiert noch Build-Befehle ausgeführt werden. Nach Änderungen an den Quelldateien unter `about:debugging#/runtime/this-firefox` bei der Erweiterung auf **Neu laden** klicken, die bisherige Seite für neue Tabs schließen und einen neuen Tab öffnen.

Lokale CSS- und JavaScript-Verweise in `newtab.html` verwenden eine gemeinsame Ressourcenversion `?v=...`. Diese Parameter bei Änderungen gemeinsam aktualisieren. Die Reihenfolge der Abhängigkeiten beibehalten: `i18n.js` zuerst, gemeinsame Hilfsfunktionen vor ihren Nutzern und die Module für Gruppen, Raster, Menüs, Übergänge und Migration vor `shortcuts.js` laden. Die Module halten ihren internen Zustand in getrennten Gültigkeitsbereichen und arbeiten über explizite Schnittstellen oder Ereignisse zusammen. Symbolverarbeitung und Kapazitätsregeln besitzen jeweils eine gemeinsame Implementierung; die Stile der Hintergrundauswahl bleiben auf den Einstellungsbereich begrenzt.

### Übersetzungen aktualisieren

In `_locales/*/messages.json` dieselben Nachrichtenschlüssel verwenden. Benannte Werte mit `newTabI18n.t(key, { name, count })` einsetzen und statische Inhalte mit `data-i18n`, `data-i18n-title`, `data-i18n-aria-label` und `data-i18n-placeholder` übersetzen. Auch Menütexte in Vorlagen berücksichtigen, entsprechende regionale Kataloge gemeinsam aktualisieren und alle 8 README-Versionen inhaltlich abstimmen. Siehe [Mozillas Anleitung zur Internationalisierung](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization).

## Lizenz

Die GNU General Public License v3.0 steht in [LICENSE](LICENSE).
