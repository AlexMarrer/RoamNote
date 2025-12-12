export const ERROR_MESSAGES = {
  OFFLINE: 'Keine Internetverbindung. Diese Aktion ist nur online möglich.',
  TRIP_CREATE_FAILED: 'Fehler beim Erstellen des Trips',
  TRIP_UPDATE_FAILED: 'Fehler beim Aktualisieren des Trips',
  TRIP_DELETE_FAILED: 'Fehler beim Löschen des Trips',
  PLACE_CREATE_FAILED: 'Fehler beim Erstellen des Ortes',
  PLACE_UPDATE_FAILED: 'Fehler beim Aktualisieren des Ortes',
  PLACE_DELETE_FAILED: 'Fehler beim Löschen des Ortes',
  DATA_DELETE_FAILED: 'Fehler beim Löschen der Daten',
} as const;

export const SUCCESS_MESSAGES = {
  DATA_DELETED: 'Alle Daten wurden erfolgreich gelöscht',
} as const;
