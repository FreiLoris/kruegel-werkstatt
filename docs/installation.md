# Installation für eine neue Werkstatt

> Diese Anleitung ist für Garagen, die die App neu einsetzen – darum Deutsch, wie die App selbst.
> Für Entwickler: [`deployment-nas.md`](deployment-nas.md) (Krügels NAS, Kanäle, Releases) und
> [`operations.md`](operations.md) (Sicherung, Wiederherstellen).
>
> Gilt ab **Version 1.5.0** – erst damit gibt es den Einrichtungs-Assistenten und «Kunden übernehmen».

Die App läuft auf **einem Gerät in der Werkstatt**, das immer eingeschaltet ist. Alle anderen
Geräte – Laptop, Tablet, der Fernseher in der Werkstatt – öffnen sie im Browser. Es wird nichts
auf ihnen installiert.

## Vorher wichtig

- **Nur im Werkstatt-Netz.** Die App hat keine Anmeldung mit Passwort: Wer sie im Netz erreicht,
  kann alles sehen und ändern.
  - Sie darf **nie direkt ins Internet** gestellt werden: keine Portweiterleitung im Router, UPnP
    im Router ausschalten.
  - **Ein WLAN für Kunden muss ein eigenes Gast-WLAN sein** (im Router einschalten) – sonst sieht
    jeder Kunde im Wartebereich alle Daten.
  - Zugriff von unterwegs nur über ein VPN, z. B. Tailscale oder das VPN des Routers.
- **Die Daten gehören der Werkstatt.** Sie liegen nur auf dem eigenen Gerät, nirgends in einer Cloud.
  Dafür ist die Werkstatt selbst für die Datensicherung zuständig ([unten](#7-datensicherung)).
- **Updates kommen automatisch** vom Entwickler der App (über GitHub). Wer die App betreut und bei
  Problemen hilft, wird beim Bezug der App abgemacht – am besten schriftlich.

## Was es braucht

| | Empfohlen | Geht auch |
|---|---|---|
| Gerät für die App | Synology NAS mit Intel- oder AMD-Prozessor (z. B. DS224+, DS423+), mind. 2 GB RAM, DSM 7.2 oder neuer | ein Windows-PC mit Docker, der während der Arbeitszeit immer läuft |
| Geräte zum Arbeiten | Laptop, Tablet (ab ca. 10 Zoll), Fernseher mit Browser | – Handys werden nicht unterstützt |
| Netz | alle Geräte im selben Werkstatt-Netz (LAN/WLAN) | |

Die App braucht etwa 1 GB Arbeitsspeicher. Sie gibt es nur für Intel/AMD-Prozessoren: Synology-Modelle
mit ARM-Prozessor (z. B. DS223j, DS124) gehen nicht.

## Installation auf einer Synology

Die Begriffe sind die des deutschen DSM.

### 1. Container Manager installieren

*Paket-Zentrum* → «Container Manager» suchen → *Installieren*. Dabei entsteht der freigegebene
Ordner `docker`. Er enthält später das Datenbank-Passwort und die Sicherungen: **nur Administratoren
dürfen darauf zugreifen** (*Systemsteuerung → Gemeinsamer Ordner → docker → Bearbeiten →
Berechtigungen*).

### 2. Ordner anlegen

*File Station* → im Ordner `docker` einen neuen Ordner `werkstatt`, darin einen Ordner
`Datensicherung`.

Den Ordner `Datensicherung` gleich beschreibbar machen – sonst kann die App vor einem Update keine
Sicherung schreiben und startet danach nicht: Rechtsklick auf `Datensicherung` → *Eigenschaften →
Berechtigung → Erstellen* → Benutzer «Jeder», *Schreiben* und *Lesen* ankreuzen, *auf Unterordner
anwenden* → *OK*.

Wo der Ordner liegt: Rechtsklick auf `docker` → *Eigenschaften* → *Speicherort*, z. B.
`/volume1/docker`. Steht dort nicht `volume1`, muss das in Schritt 3 bei `BACKUP_DIR` angepasst werden.

### 3. Die zwei Dateien vorbereiten

Auf einem PC – vorher im Explorer *Anzeigen → Einblenden → Dateinamenerweiterungen* einschalten,
sonst sieht man nicht, ob eine Datei `.env` oder `.env.txt` heisst:

1. [`deploy/compose.yaml`](../deploy/compose.yaml) herunterladen (auf GitHub *Raw* → *Speichern
   unter*) – Name `compose.yaml`.
2. [`deploy/garage.env.example`](../deploy/garage.env.example) herunterladen und umbenennen in
   **`.env`** (genau so, mit Punkt am Anfang, ohne `.txt` oder `.example`).
3. `.env` mit einem Texteditor öffnen und bei `DB_PASSWORD` ein eigenes, langes Passwort eintragen –
   nur Buchstaben und Ziffern, z. B. 24 Zeichen aus dem Passwort-Manager. **Im Passwort-Manager
   aufbewahren.** Es wird nur einmal gebraucht; später ändern geht nicht. Den Rest so lassen.
4. Beide Dateien mit *File Station* in `docker/werkstatt` hochladen. Die Kopie der `.env` auf dem
   PC danach löschen – sie enthält das Passwort.

### 4. Projekt erstellen

*Container Manager → Projekt → Erstellen*:

- Projektname: `werkstatt`
- Pfad: `/docker/werkstatt`
- Quelle: *Vorhandene compose.yaml verwenden*
- kein Webportal → *Fertig*

Der Container Manager lädt die App herunter und startet sie. Das erste Mal dauert es ein paar
Minuten. Danach laufen fünf Container: `db`, `backend`, `frontend`, `backup`, `watchtower`.
Meldet schon das Erstellen einen Fehler wie `DB_PASSWORD fehlt in .env`, heisst die Datei nicht
genau `.env` oder liegt nicht neben `compose.yaml`.

Zusätzlich empfohlen: in *Systemsteuerung → Sicherheit → Firewall* den Port 8090 nur für das
Werkstatt-Netz (z. B. `192.168.1.0/24`) erlauben.

### 5. Die Adresse der App

Die Adresse ist die des NAS mit `:8090`, z. B. `http://192.168.1.50:8090`. Die Adresse des NAS steht
in *Systemsteuerung → Netzwerk → Netzwerkschnittstelle*.

Damit sie sich nie ändert: im Router dem NAS eine **feste IP-Adresse** geben (meist unter
*Heimnetz* oder *DHCP* beim Gerät: «immer die gleiche IP-Adresse zuweisen»).

Weiter mit [Erster Start](#6-erster-start).

## Installation auf einem Windows-PC

Nur wenn kein NAS da ist. Der PC muss laufen, solange in der Werkstatt gearbeitet wird:

- *Einstellungen → System → Bildschirm und Energiesparmodus*: Energiesparmodus «Nie».
- Docker Desktop startet erst, wenn sich jemand an Windows **anmeldet**. Nach einem Neustart (z. B.
  durch ein Windows-Update) ist die App weg, bis sich jemand anmeldet.

Schritte:

1. [Docker Desktop](https://www.docker.com/products/docker-desktop/) installieren. In Docker Desktop:
   *Settings → General → Start Docker Desktop when you sign in* einschalten.
2. Einen Ordner anlegen: **`Dokumente\Werkstatt`** – dort erfasst ihn auch die Datensicherung von
   Windows ([unten](#7-datensicherung)).
3. Die zwei Dateien hineinlegen wie in [Schritt 3](#3-die-zwei-dateien-vorbereiten), **nur Punkte
   1–3** – die `.env` bleibt hier liegen. In der `.env` die Zeile `BACKUP_DIR=…` ändern in
   `BACKUP_DIR=./Datensicherung`.
4. Im Ordner ein Terminal öffnen (Explorer: Rechtsklick → *Im Terminal öffnen*) und eingeben:
   ```
   docker compose -p werkstatt up -d
   ```
   Fragt die Windows-Firewall nach: *Zulassen* für **private** Netzwerke. Das Werkstatt-Netz muss in
   Windows als «Privates Netzwerk» eingestellt sein (*Einstellungen → Netzwerk und Internet →
   WLAN/Ethernet → Netzwerkprofiltyp*).
5. Die Adresse ist `http://<IP des PCs>:8090` – auf dem PC selbst `http://localhost:8090`. Die IP des
   PCs zeigt *Einstellungen → Netzwerk und Internet → Eigenschaften*. Wie beim NAS im Router eine
   **feste IP-Adresse** für den PC einstellen.

## 6. Erster Start

Im Browser die Adresse öffnen. Die App führt durch die Einrichtung. In jedem Schritt die Angaben mit
**«Speichern»** sichern, dann **«Weiter»**:

1. **Firma** – Name, Adresse, Logo (erscheint auf dem Auftragszettel) und der Kanton für neue
   Kontrollschilder.
2. **Module** – was die Werkstatt nicht braucht, ausschalten (z. B. Ersatzwagen, Pneuhotel, MFK).
   Ausgeschaltetes verschwindet überall; einschalten geht jederzeit wieder.
3. **Feiertage** – die Feiertage des eigenen Kantons ankreuzen.
4. **Lifte** – die Hebebühnen der Werkstatt.
5. **Prüfstellen** – nur mit dem Modul MFK.
6. **Mitarbeiter** – alle, die mit der App arbeiten. Mit der ersten Person fragt das Gerät «Wer
   benutzt dieses Gerät?».
7. **Kunden übernehmen** (der letzte Schritt) – freiwillig, siehe unten.

«Fertig» oder «Später einrichten» beendet den Assistenten – alles lässt sich jederzeit unter
*Einstellungen* ändern.

### Kunden und Fahrzeuge aus dem bisherigen Programm

Im bisherigen Programm die Kunden (mit Fahrzeugen) als **CSV- oder Excel-Datei (.xlsx)** exportieren –
fast jedes Programm kann das, oft unter «Export» oder «Liste speichern». Eine alte Excel-Datei (.xls)
zuerst in Excel als .xlsx oder CSV speichern. Dann in der App (letzter Schritt des Assistenten, oder
*Einstellungen → Kunden und Fahrzeuge → Kunden übernehmen*):

1. Datei hochladen.
2. Prüfen, welche Spalte was ist – die App schlägt es nach den Überschriften vor.
3. **Probelauf** – zeigt, was übernommen würde, und welche Zeilen nicht gehen. Noch wird nichts
   gespeichert. **Genau prüfen** – zum Beispiel ein paar Kunden mit der Datei vergleichen.
4. **Jetzt übernehmen.**

Nochmals hochladen ergänzt nur, was fehlt: Was die App schon hat (gleicher Name und Adresse, gleiches
Schild oder gleiche Fahrgestellnummer), wird weder doppelt angelegt noch geändert. Fehler in schon
übernommenen Kunden darum in der App korrigieren, nicht mit einer neuen Datei. Danach werden die
Kunden in der App gepflegt.

Wer mit **SwissGarage** weiterarbeitet, nimmt stattdessen *Einstellungen → SwissGarage-Import*: Dort
werden die Exporte aus SwissGarage (Adressliste, dann Fahrzeugliste) immer wieder von Hand
hochgeladen – neue Kunden kommen dazu, geänderte werden nachgeführt, fehlende deaktiviert.

## 7. Datensicherung

Jede Nacht um 02:00 sichert die App die ganze Datenbank in den Ordner `Datensicherung`
(Dateien `werkstatt_….dump`, 30 Tage lang). Vor jedem Update mit Änderung an der Datenbank kommt eine
zusätzliche Sicherung in `Datensicherung/vor-update`.

**Diese Sicherungen liegen auf demselben Gerät wie die App.** Fällt das Gerät aus, sind beide weg.
Darum den Ordner `Datensicherung` regelmässig **woanders hin kopieren**:

- Synology: *Hyper Backup* auf eine USB-Festplatte oder ein zweites NAS, täglich, **mit
  Verschlüsselung** (eine gestohlene Festplatte enthält sonst alle Kundendaten).
- Windows-PC: *Systemsteuerung → Dateiversionsverlauf* auf eine USB-Festplatte einschalten – er sichert
  den Ordner `Dokumente`, darin `Werkstatt\Datensicherung` (darum der Ordner aus Schritt 2). Die
  USB-Festplatte verschlüsseln (BitLocker To Go) und sicher aufbewahren.

Die Sicherungen enthalten Kundendaten – nicht in eine öffentliche Freigabe legen, nicht per Mail
verschicken.

Prüfen, ob es läuft: am Tag nach der Installation muss eine Datei `werkstatt_….dump` im Ordner sein.
Wiederherstellen: [`operations.md`](operations.md#restore) – nur mit der Person, die die App betreut.

## Geräte einrichten

Auf jedem Laptop und Tablet die Adresse im Browser öffnen und als **Lesezeichen** oder auf dem
Tablet als *Zum Startbildschirm* speichern. Jedes Gerät fragt «Wer benutzt dieses Gerät?» – die
gewählte Person steht bei allem, was auf diesem Gerät geändert wird.

**Bildschirmsperre:** Nach 5 Minuten ohne Bedienung fragt ein Gerät wieder, wer daran ist – damit
niemand unter falschem Namen arbeitet. Die Minuten für alle: *Einstellungen → Bildschirmsperre*. Dort
auch, was **dieses** Gerät dann tut: im Büro sperren, beim gemeinsamen Werkstatt-Tablet still zurück
auf «Nur ansehen», oder nie.

**Fernseher in der Werkstatt:** dort «Nur ansehen» wählen. Er zeigt dann die Übersicht ohne
Bearbeiten-Knöpfe. Ein Schutz ist das nicht: Am Gerät kann jeder eine Person wählen – die App hat
keine Passwörter (siehe [Vorher wichtig](#vorher-wichtig)).

## Updates

Die App aktualisiert sich selbst: Jeden Mittag schaut sie nach einer neuen Version und startet
damit neu (etwa eine Minute weg). Datenbank-Änderungen macht sie selbst, mit Sicherung vorher.
Wann sie nachschaut, steht in der `.env` bei `UPDATE_SCHEDULE`.

Um auf einer bestimmten Version zu bleiben: in der `.env` z. B. `APP_VERSION=v1.5.0` eintragen und
das Projekt neu erstellen (Synology: *Projekt → Aktion → Erstellen*; Windows:
`docker compose -p werkstatt up -d`). Zurück zu den Updates: `APP_VERSION=latest`.

**Nicht selbst auf eine ältere Version zurückgehen,** wenn ein Update nicht passt: Hat das Update die
Datenbank geändert, läuft die ältere Version damit nicht mehr richtig. Das macht die Person, die die
App betreut (mit der Sicherung aus `vor-update`).

## SMS-Erinnerungen (freiwillig)

Die App kann Kunden am Werktag vor dem Termin per SMS erinnern. Dazu braucht die Werkstatt ein
eigenes Konto bei [ASPSMS](https://www.aspsms.com) (Guthaben pro SMS):

1. Bei ASPSMS anmelden, Guthaben laden, *Userkey* und *API-Passwort* notieren.
2. In der `.env` bei `ASPSMS_USERKEY` und `ASPSMS_PASSWORD` eintragen und das Projekt neu erstellen
   (wie bei den Updates).
3. In der App *Einstellungen → Kundenerinnerungen*: Dort muss jetzt «SMS: eingerichtet» stehen.
   Den **SMS-Absender** prüfen – bis 11 Buchstaben oder Ziffern, ohne Leerzeichen und Umlaute, z. B.
   `GarageMuster`. Leer lassen: das erste Wort des Firmennamens. Dann die Erinnerungen einschalten.

## Wenn etwas nicht geht

| Problem | Was tun |
|---|---|
| Die Adresse öffnet nichts | Läuft das Gerät? Synology: *Container Manager → Projekt → werkstatt* – alle Container «Wird ausgeführt»? Nach einem Neustart dauert es 1–2 Minuten; Windows: ist jemand angemeldet und läuft Docker Desktop? Stimmt die Adresse noch (feste IP)? |
| Ein Container startet nicht | Synology: Container anklicken → *Protokoll*. Häufig: die `.env` heisst falsch (z. B. `.env.txt`) oder liegt nicht neben `compose.yaml`. |
| Nach einem Update startet die App nicht mehr | Im Protokoll des Containers `backend` nach «Backup before migrating» schauen: Fehlt das Schreibrecht auf `Datensicherung/vor-update`, wie in [Schritt 2](#2-ordner-anlegen) geben. Sonst die Person fragen, die die App betreut – nicht selbst zurückgehen. |
| «Wer ist am Gerät?» kommt immer wieder | Das ist die Bildschirmsperre nach einigen Minuten ohne Bedienung (*Einstellungen → Bildschirmsperre*). Kommt die Frage nach **jedem** Öffnen: Der Browser löscht seine Daten (privates Fenster, «Daten beim Schliessen löschen»). |
| Umlaute beim Kunden-Import falsch (Ã¼ statt ü) | Beim Hochladen den Zeichensatz auf den anderen umstellen. |
