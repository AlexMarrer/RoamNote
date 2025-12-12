# RoamNote

Mobile Reise-Tagebuch App mit Reiseplanung und Karten-Integration.

## Tech Stack

- **Framework**: Ionic 8 + Angular 20 (Standalone Components)
- **Mobile**: Capacitor 7.4.4 für Android
- **Backend**: Supabase (PostgreSQL)
- **Maps**: @capacitor/google-maps + Google Places API
- **Styling**: SCSS mit BEM-Convention

## Features

### 📍 Reiseplanung

- Trips mit mehreren Orten erstellen
- Google Places Integration für Ortssuche
- Ankunfts-/Abreisedaten pro Ort
- Drag & Drop Reordering
- Push-Benachrichtigungen 24h vor Ankunft

### 🗺️ Interaktive Karte

- Live User-Position Tracking (GPS)
- Marker für alle Trip-Orte
- Dark Mode Support
- Click-to-Center Funktionalität

### 📔 Tagebuch (Offline)

- Tagesbasierte Einträge
- Mehrere Notizen pro Tag
- Verknüpfung mit Trip-Orten
- Lokale Speicherung (Capacitor Preferences)

### 🌙 Dark Mode

- Systemweiter Toggle
- Status Bar Synchronisation
- Optimierte Farbpalette für beide Modi

## Architektur

### Services

- **TripsService**: CRUD für Trips mit RxJS BehaviorSubjects + Offline-Support
- **DiaryService**: Reactive Layer für Tagebuch-Einträge
- **GooglePlacesService**: Platform-aware (Web JS SDK, Android REST API)
- **SpotsService**: Geolocation + Map Data Transformation
- **NotificationService**: Lokale Push-Benachrichtigungen
- **ThemeService**: Dark Mode Management

### Datenmodell

```sql
Trip (id, name, note, start_date, end_date, created_at)
Place (id, name, latitude, longitude)
TripPlace (id, trip_id, place_id, visit_order, arrival_date, departure_date, is_alert_active, note)
```

Lokale Speicherung via Capacitor Preferences:

```typescript
DiaryEntry (id, date, title?, notes[])
DiaryNote (id, content, spotIds[], createdAt)
```

## Development

### Prerequisites

- Node.js
- Ionic CLI
- Android Studio (für Android Build)
- Supabase Account
- Google Maps API Key

### Setup

```bash
cd roam-note
npm install
```

**⚠️ WICHTIG: API Key Konfiguration**

```bash
cd android
cp gradle.properties.example gradle.properties
# Bearbeite gradle.properties und füge deinen Google Maps API Key ein
```

Siehe `SECURITY_SETUP.md` für Details zur API Key Verwaltung.

```bash
ionic serve  # Web Development
ionic cap run android  # Android Build
```

### Configuration

Siehe `projekt-setup-context.md` für detaillierte Setup-Anleitung
