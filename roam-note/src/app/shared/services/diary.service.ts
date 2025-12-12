import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  map,
  of,
  switchMap,
} from 'rxjs';
import { DiaryStorageService } from './diary-storage.service';
import { TripsService } from './trips.service';
import {
  DiaryEntry,
  DiaryEntryInsert,
  DiaryEntryUpdate,
  DiaryEntryWithDetails,
  DiaryNote,
  DiaryNoteInsert,
  DiaryNoteUpdate,
  DiaryNoteWithDetails,
  SpotWithTrip,
} from '../models/diary-entry.model';

/**
 * Service for managing diary entries with reactive updates
 * Combines local storage with Supabase spot data
 */
@Injectable({
  providedIn: 'root',
})
export class DiaryService {
  private readonly entriesSubject$ = new BehaviorSubject<DiaryEntry[]>([]);

  constructor(
    private readonly diaryStorage: DiaryStorageService,
    private readonly tripsService: TripsService
  ) {
    this.loadEntries();
  }

  /**
   * Get all diary entries with resolved spot details
   * @returns Observable of diary entries with spot information
   */
  getDiaryEntries$(): Observable<DiaryEntryWithDetails[]> {
    return combineLatest([
      this.entriesSubject$.asObservable(),
      this.getAllSpotsInternal$(),
    ]).pipe(
      map(([entries, allSpots]) => {
        return entries.map((entry) =>
          this.enrichEntryWithDetails(entry, allSpots)
        );
      })
    );
  }

  /**
   * Get a specific diary entry by date with details
   * @param date ISO date string (YYYY-MM-DD)
   * @returns Observable of diary entry or null
   */
  getDiaryEntryByDate$(date: string): Observable<DiaryEntryWithDetails | null> {
    return this.getDiaryEntries$().pipe(
      map((entries) => entries.find((entry) => entry.date === date) || null)
    );
  }

  /**
   * Create a new diary entry
   * @param data Entry data
   * @returns Promise of created entry
   */
  async createEntry(data: DiaryEntryInsert): Promise<DiaryEntry> {
    const now = new Date().toISOString();
    const entry: DiaryEntry = {
      id: this.generateId(),
      date: data.date,
      title: data.title,
      notes: [],
      createdAt: now,
      updatedAt: now,
    };

    await this.diaryStorage.saveEntry(entry);
    await this.loadEntries();
    return entry;
  }

  /**
   * Update an existing diary entry
   * @param id Entry ID
   * @param data Update data
   */
  async updateEntry(id: string, data: DiaryEntryUpdate): Promise<void> {
    const entry = await this.diaryStorage.getEntryById(id);
    if (!entry) {
      throw new Error(`Entry with id ${id} not found`);
    }

    const updatedEntry: DiaryEntry = {
      ...entry,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    await this.diaryStorage.updateEntry(updatedEntry);
    await this.loadEntries();
  }

  /**
   * Delete a diary entry
   * @param id Entry ID
   */
  async deleteEntry(id: string): Promise<void> {
    await this.diaryStorage.deleteEntry(id);
    await this.loadEntries();
  }

  /**
   * Delete all diary entries
   */
  async deleteAllEntries(): Promise<void> {
    await this.diaryStorage.deleteAllEntries();
    await this.loadEntries();
  }

  /**
   * Add a note to an entry
   * @param entryId Entry ID
   * @param data Note data
   * @returns Promise of created note
   */
  async addNoteToEntry(
    entryId: string,
    data: DiaryNoteInsert
  ): Promise<DiaryNote> {
    const entry = await this.diaryStorage.getEntryById(entryId);
    if (!entry) {
      throw new Error(`Entry with id ${entryId} not found`);
    }

    const now = new Date().toISOString();
    const note: DiaryNote = {
      id: this.generateId(),
      content: data.content,
      spotIds: data.spotIds,
      createdAt: now,
      updatedAt: now,
    };

    const updatedEntry: DiaryEntry = {
      ...entry,
      notes: [...entry.notes, note],
      updatedAt: now,
    };

    await this.diaryStorage.updateEntry(updatedEntry);
    await this.loadEntries();
    return note;
  }

  /**
   * Update a note in an entry
   * @param entryId Entry ID
   * @param noteId Note ID
   * @param data Update data
   */
  async updateNote(
    entryId: string,
    noteId: string,
    data: DiaryNoteUpdate
  ): Promise<void> {
    const entry = await this.diaryStorage.getEntryById(entryId);
    if (!entry) {
      throw new Error(`Entry with id ${entryId} not found`);
    }

    const noteIndex = entry.notes.findIndex((note) => note.id === noteId);
    if (noteIndex === -1) {
      throw new Error(`Note with id ${noteId} not found`);
    }

    const notes = [...entry.notes];
    notes[noteIndex] = {
      ...notes[noteIndex],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    const updatedEntry: DiaryEntry = {
      ...entry,
      notes,
      updatedAt: new Date().toISOString(),
    };

    await this.diaryStorage.updateEntry(updatedEntry);
    await this.loadEntries();
  }

  /**
   * Delete a note from an entry
   * @param entryId Entry ID
   * @param noteId Note ID
   */
  async deleteNote(entryId: string, noteId: string): Promise<void> {
    await this.diaryStorage.deleteNote(entryId, noteId);
    await this.loadEntries();
  }

  /**
   * Get all available spots from trips for selection
   * @returns Observable of all spots with trip information
   */
  getAllSpots$(): Observable<SpotWithTrip[]> {
    return this.getAllSpotsInternal$();
  }

  /**
   * Internal method to get all spots with trip information
   * @returns Observable of spots
   */
  private getAllSpotsInternal$(): Observable<SpotWithTrip[]> {
    return this.tripsService.getTrips().pipe(
      switchMap((trips) => {
        if (trips.length === 0) {
          return of([]);
        }

        // Get all trip places for all trips
        const tripPlacesObservables = trips.map((trip) =>
          this.tripsService.getTripPlaces(trip.id).pipe(
            map((tripPlaces) => {
              return (tripPlaces || []).map(
                (tp): SpotWithTrip => ({
                  id: tp.id,
                  name: tp.place_name,
                  tripId: trip.id,
                  tripName: trip.name,
                  arrivalDate: tp.arrival_date || null,
                  departureDate: tp.departure_date || null,
                  latitude: Number(tp.place_latitude),
                  longitude: Number(tp.place_longitude),
                })
              );
            })
          )
        );

        return combineLatest(tripPlacesObservables).pipe(
          map((allTripPlaces) => {
            // Flatten array of arrays
            const allSpots: SpotWithTrip[] = [];
            for (const tripPlaces of allTripPlaces) {
              allSpots.push(...tripPlaces);
            }
            // Sort by arrival date
            return allSpots.sort((a, b) => {
              if (a.arrivalDate && b.arrivalDate) {
                return (
                  new Date(a.arrivalDate).getTime() -
                  new Date(b.arrivalDate).getTime()
                );
              }
              return a.name.localeCompare(b.name);
            });
          })
        );
      })
    );
  }

  /**
   * Load entries from storage and emit to subject
   */
  private async loadEntries(): Promise<void> {
    const entries = await this.diaryStorage.getAllEntries();
    this.entriesSubject$.next(entries);
  }

  /**
   * Enrich diary entry with spot details from trips
   * @param entry Raw diary entry
   * @param allSpots All available spots with trip information
   * @returns Entry with resolved spot details
   */
  private enrichEntryWithDetails(
    entry: DiaryEntry,
    allSpots: SpotWithTrip[]
  ): DiaryEntryWithDetails {
    const notesWithDetails: DiaryNoteWithDetails[] = entry.notes.map((note) => {
      const spots = note.spotIds
        .map((spotId) => {
          const spot = allSpots.find((s) => s.id === spotId);
          if (!spot) {
            return null;
          }

          return {
            id: spot.id,
            name: spot.name,
            tripName: spot.tripName,
            arrivalDate: spot.arrivalDate,
          };
        })
        .filter((spot): spot is NonNullable<typeof spot> => spot !== null);

      return {
        ...note,
        spots,
      };
    });

    return {
      ...entry,
      notes: notesWithDetails,
    };
  }

  /**
   * Generate a unique ID for entries and notes
   * @returns UUID string
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
