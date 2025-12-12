/**
 * Diary Entry Models
 * Stores diary entries locally (not in Supabase)
 * Each entry represents a day with multiple notes
 * Each note can be associated with multiple spots from trips
 */

export interface DiaryNote {
  readonly id: string; // UUID
  readonly content: string; // Note text
  readonly spotIds: ReadonlyArray<number>; // TripPlace IDs from Supabase
  readonly createdAt: string; // ISO DateTime
  readonly updatedAt: string; // ISO DateTime
}

export interface DiaryEntry {
  readonly id: string; // UUID
  readonly date: string; // ISO Date (YYYY-MM-DD)
  readonly title?: string; // Optional title for the day
  readonly notes: ReadonlyArray<DiaryNote>;
  readonly createdAt: string; // ISO DateTime
  readonly updatedAt: string; // ISO DateTime
}

/**
 * Spot with trip information for display
 */
export interface SpotWithTrip {
  readonly id: number;
  readonly name: string;
  readonly tripId: number;
  readonly tripName: string;
  readonly arrivalDate: string | null;
  readonly departureDate: string | null;
  readonly latitude: number;
  readonly longitude: number;
}

/**
 * Diary Entry with resolved spot details from Supabase
 * Used for display purposes
 */
export interface DiaryNoteWithDetails extends DiaryNote {
  readonly spots: ReadonlyArray<{
    readonly id: number;
    readonly name: string;
    readonly tripName: string;
    readonly arrivalDate: string | null;
  }>;
}

export interface DiaryEntryWithDetails extends Omit<DiaryEntry, 'notes'> {
  readonly notes: ReadonlyArray<DiaryNoteWithDetails>;
}

/**
 * Type for creating new diary entries
 */
export interface DiaryEntryInsert {
  readonly date: string; // ISO Date
  readonly title?: string;
}

/**
 * Type for creating new diary notes
 */
export interface DiaryNoteInsert {
  readonly content: string;
  readonly spotIds: ReadonlyArray<number>;
}

/**
 * Type for updating diary entries
 */
export interface DiaryEntryUpdate {
  readonly title?: string;
}

/**
 * Type for updating diary notes
 */
export interface DiaryNoteUpdate {
  readonly content?: string;
  readonly spotIds?: ReadonlyArray<number>;
}
