# Installation für eine neue Werkstatt

> Diese Anleitung ist für Garagen, die die App neu einsetzen – darum Deutsch, wie die App selbst.
> Für Entwickler: [`deployment-nas.md`](deployment-nas.md) (Krügels NAS, Kanäle, Releases) und
> [`operations.md`](operations.md) (Sicherung, Wiederherstellen).

Die App läuft auf **einem Gerät in der Werkstatt**, das immer eingeschaltet ist. Alle anderen
Geräte – Laptop, Tablet, der Fernseher in der Werkstatt – öffnen sie im Browser. Es wird nichts
auf ihnen installiert.

## Vorher wichtig

- **Nur im Werkstatt-Netz.** Die App hat keine Anmeldung mit Passwort: Wer sie im Netz erreicht,
  kann alles sehen und ändern. Sie darf **nie direkt ins Internet** gestellt werden (keine
  Portweiterleitung im Router). Zugriff von unterwegs nur über ein VPN, z. B. Tailscale oder das VPN
  des Routers.
- **Die Daten gehören der Werkstatt.** Sie liegen nur auf dem eigenen Gerät, nirgends in einer Cloud.
  Dafür ist die Werkstatt selbst für die Datensicherung zuständig (unten, Schritt 7).

## Was es braucht

| | Empfohlen | Geht auch |
|---|---|---|
| Gerät für die App | Synology NAS mit Intel- oder AMD-Prozessor (z. B. DS224+, DS423+), mind. 2 GB RAM, DSM 7.2 oder neuer | ein Windows- oder Linux-PC mit Docker, der immer läuft |
| Geräte zum Arbeiten | Laptop, Tablet (ab ca. 10 Zoll), Fernseher mit Browser | – Handys werden nicht unterstützt |
| Netz | alle Geräte im selben Netz (LAN/WLAN) | |

Die App braucht etwa 1 GB Arbeitsspeicher. Synology-Modelle mit ARM-Prozessor (z. B. DS223j) haben
keinen Container Manager – damit geht es nicht.

## Installation auf einer Synology

Die Begriffe sind die des deutschen DSM.

### 1. Container Manager installieren

*Paket-Zentrum* → «Container Manager» suchen → *Installieren*. Dabei entsteht der freigegebene
Ordner `docker`.

### 2. Ordner anlegen

*File Station* → im Ordner `docker` einen neuen Ordner `werkstatt`, darin einen Ordner
`Datensicherung`.

### 3. Die zwei Dateien vorbereiten

Auf einem PC:

1. [`deploy/compose.yaml`](../deploy/compose.yaml) herunterladen (auf GitHub *Raw* → *Speichern
   unter*) – Name `compose.yaml`.
2. [`deploy/garage.env.example`](../deploy/garage.env.example) herunterladen und als **`.env`**
   speichern (genau so, mit Punkt am Anfang, ohne `.txt`).
3. `.env` mit einem Texteditor öffnen und bei `DB_PASSWORD` ein eigenes, langes Passwort eintragen –
   nur Buchstaben und Ziffern, z. B. 24 Zeichen aus dem Passwort-Manager. **Im Passwort-Manager
   aufbewahren.** Es wird nur einmal gebraucht, später ändern geht nicht.
4. Den Rest so lassen. `BACKUP_DIR` passt zum Ordner aus Schritt 2.

Beide Dateien mit *File Station* in `docker/werkstatt` hochladen. Die Kopie der `.env` auf dem PC
danach löschen.

### 4. Projekt erstellen

*Container Manager → Projekt → Erstellen*:

- Projektname: `werkstatt`
- Pfad: `/docker/werkstatt`
- Quelle: *Vorhandene compose.yaml verwenden*
- kein Webportal → *Fertig*

Der Container Manager lädt die App herunter und startet sie. Das erste Mal dauert es ein paar
Minuten. Danach laufen fünf Container: `db`, `backend`, `frontend`, `backup`, `watchtower`.

### 5. Die Adresse der App

Die Adresse ist die des NAS mit `:8090`, z. B. `http://192.168.1.50:8090`. Die Adresse des NAS steht
in *Systemsteuerung → Netzwerk → Netzwerkschnittstelle*.

Damit sie sich nie ändert: im Router dem NAS eine **feste IP-Adresse** geben (bei der Fritzbox:
*Heimnetz → Netzwerk → Gerät → Diesem Netzwerkgerät immer die gleiche IPv4-Adresse zuweisen*).

Weiter mit [Erster Start](#6-erster-start).

## Installation auf einem Windows-PC

Nur wenn kein NAS da ist. Der PC muss laufen, solange in der Werkstatt gearbeitet wird – und darf
nicht in den Ruhezustand gehen (*Einstellungen → System → Energie*: Ruhezustand «Nie»).

1. [Docker Desktop](https://www.docker.com/products/docker-desktop/) installieren. In Docker Desktop:
   *Settings → General → Start Docker Desktop when you sign in* einschalten.
2. Einen Ordner anlegen, z. B. `C:\Werkstatt`, und die zwei Dateien hineinlegen wie oben in
   [Schritt 3](#3-die-zwei-dateien-vorbereiten). In der `.env` zusätzlich
   `BACKUP_DIR=./Datensicherung` setzen.
3. Im Ordner ein Terminal öffnen (Explorer: Rechtsklick → *Im Terminal öffnen*) und eingeben:
   ```
   docker compose -p werkstatt up -d
   ```
4. Die Adresse ist `http://<Name oder IP des PCs>:8090` – auf dem PC selbst `http://localhost:8090`.
   Beim ersten Aufruf von einem anderen Gerät fragt die Windows-Firewall eventuell nach: *Zulassen*
   für private Netzwerke.

## 6. Erster Start

Im Browser die Adresse öffnen. Die App führt durch die Einrichtung:

1. **Firma** – Name, Adresse, Logo (erscheint auf dem Auftragszettel) und der Kanton für neue
   Kontrollschilder.
2. **Module** – was die Werkstatt nicht braucht, ausschalten (z. B. Ersatzwagen, Pneuhotel, MFK).
   Ausgeschaltetes verschwindet überall; einschalten geht jederzeit wieder.
3. **Feiertage** – die Feiertage des eigenen Kantons ankreuzen.
4. **Lifte** – die Hebebühnen der Werkstatt.
5. **Prüfstellen** – nur mit dem Modul MFK.
6. **Mitarbeiter** – alle, die mit der App arbeiten. Mit der ersten Person fragt das Gerät «Wer
   benutzt dieses Gerät?».
7. **Kunden übernehmen** – freiwillig, siehe unten.

Jeder Schritt wird für sich gespeichert. «Später einrichten» beendet den Assistenten – alles lässt
sich jederzeit unter *Einstellungen* ändern.

### Kunden und Fahrzeuge aus dem bisherigen Programm

Im bisherigen Programm die Kunden (mit Fahrzeugen) als **CSV- oder Excel-Datei** exportieren – fast
jedes Programm kann das, oft unter «Export» oder «Liste speichern». Dann in der App
(Assistent Schritt 7 oder *Einstellungen → Kunden übernehmen*):

1. Datei hochladen.
2. Prüfen, welche Spalte was ist – die App schlägt es nach den Überschriften vor.
3. **Probelauf** – zeigt, was übernommen würde, und welche Zeilen nicht gehen. Noch wird nichts
   gespeichert.
4. **Jetzt übernehmen.**

Was die App schon hat (gleicher Name und Adresse, gleiches Schild oder gleiche Fahrgestellnummer),
wird nicht doppelt angelegt – eine korrigierte Datei kann einfach nochmals hochgeladen werden.
Übernommene Kunden werden danach in der App gepflegt.

Wer mit **SwissGarage** arbeitet, nimmt stattdessen *Einstellungen → SwissGarage-Import*: Dort
werden Kunden und Fahrzeuge laufend aus SwissGarage nachgeführt.

## 7. Datensicherung

Jede Nacht um 02:00 sichert die App die ganze Datenbank in den Ordner `Datensicherung`
(Dateien `werkstatt_….dump`, 30 Tage lang). Vor jedem Update mit Änderung an der Datenbank kommt eine
zusätzliche Sicherung in `Datensicherung/vor-update`.

**Diese Sicherungen liegen auf demselben Gerät wie die App.** Fällt das Gerät aus, sind beide weg.
Darum den Ordner `Datensicherung` regelmässig **woanders hin kopieren**:

- Synology: *Hyper Backup* auf eine USB-Festplatte oder ein zweites NAS, täglich.
- Windows-PC: z. B. mit dem Windows-Dateiversionsverlauf auf eine USB-Festplatte.

Die Sicherungen enthalten Kundendaten – nicht in eine öffentliche Freigabe legen, nicht per Mail
verschicken.

Prüfen, ob es läuft: am Tag nach der Installation muss eine Datei `werkstatt_….dump` im Ordner sein.
Wiederherstellen: [`operations.md`](operations.md#restore) – am besten mit jemandem, der sich mit
Docker auskennt.

## Geräte einrichten

Auf jedem Laptop und Tablet die Adresse im Browser öffnen und als **Lesezeichen** oder auf dem
Tablet als *Zum Startbildschirm* speichern. Jedes Gerät fragt einmal «Wer benutzt dieses Gerät?» –
die gewählte Person steht bei allem, was auf diesem Gerät geändert wird.

**Fernseher in der Werkstatt:** dort «Nur ansehen» wählen. Er zeigt dann die Übersicht, ohne dass
jemand daran etwas ändern kann.

## Updates

Die App aktualisiert sich selbst: Jeden Mittag schaut sie nach einer neuen Version und startet
damit neu (etwa eine Minute weg). Datenbank-Änderungen macht sie selbst, mit Sicherung vorher.
Wann sie nachschaut, steht in der `.env` bei `UPDATE_SCHEDULE`.

Um auf einer Version zu bleiben: in der `.env` `APP_VERSION=v1.5.0` (die gewünschte Version)
eintragen und das Projekt neu erstellen (Synology: *Projekt → Aktion → Erstellen*; Windows:
`docker compose -p werkstatt up -d`). Zurück zu den Updates: `APP_VERSION=latest`.

## SMS-Erinnerungen (freiwillig)

Die App kann Kunden am Werktag vor dem Termin per SMS erinnern. Dazu braucht die Werkstatt ein
eigenes Konto bei [ASPSMS](https://www.aspsms.com) (Guthaben pro SMS):

1. Bei ASPSMS anmelden, Guthaben laden, *Userkey* und *API-Passwort* notieren.
2. In der `.env` bei `ASPSMS_USERKEY` und `ASPSMS_PASSWORD` eintragen und das Projekt neu erstellen
   (wie bei den Updates).
3. In der App *Einstellungen → Kundenerinnerungen*: den Absender setzen (bis 11 Buchstaben oder
   Ziffern, z. B. der Name der Garage) und einschalten.

## Wenn etwas nicht geht

| Problem | Was tun |
|---|---|
| Die Adresse öffnet nichts | Läuft das Gerät? Synology: *Container Manager → Projekt → werkstatt* – alle Container «Wird ausgeführt»? Nach einem Neustart des Geräts dauert es 1–2 Minuten. Stimmt die Adresse noch (feste IP, Schritt 5)? |
| Ein Container startet nicht | Synology: Container anklicken → *Protokoll*. Häufig: `DB_PASSWORD fehlt in .env` – die `.env` heisst falsch (z. B. `env.txt`) oder liegt nicht neben `compose.yaml`. |
| «Wer benutzt dieses Gerät?» kommt immer wieder | Der Browser löscht seine Daten (privates Fenster, Einstellungen zum Löschen beim Schliessen). |
| Umlaute beim Kunden-Import falsch (Ã¼ statt ü) | Beim Hochladen den Zeichensatz auf den anderen umstellen. |
| Nach einem Update stimmt etwas nicht | Auf die Version vorher zurück (oben, «Updates») und den Entwickler fragen – nicht selbst die Datenbank anfassen. |
