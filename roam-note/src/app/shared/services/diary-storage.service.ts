import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { DiaryEntry } from '../models/diary-entry.model';

/**
 * Service for local storage of diary entries using Capacitor Preferences
 * Data is stored locally on device, NOT in Supabase
 */
@Injectable({
  providedIn: 'root',
})
export class DiaryStorageService {
  private readonly STORAGE_KEY = 'diary_entries';

  /**
   * Get all diary entries from local storage
   * @returns Array of diary entries, sorted by date (newest first)
   */
  async getAllEntries(): Promise<DiaryEntry[]> {
    try {
      const { value } = await Preferences.get({ key: this.STORAGE_KEY });
      if (!value) {
        return [];
      }

      const entries: DiaryEntry[] = JSON.parse(value);
      // Sort by date descending (newest first)
      return entries.sort((a, b) => b.date.localeCompare(a.date));
    } catch (error) {
      console.error('[DiaryStorageService] Error loading entries:', error);
      return [];
    }
  }

  /**
   * Get a specific diary entry by date
   * @param date ISO date string (YYYY-MM-DD)
   * @returns Diary entry or null if not found
   */
  async getEntryByDate(date: string): Promise<DiaryEntry | null> {
    const entries = await this.getAllEntries();
    return entries.find((entry) => entry.date === date) || null;
  }

  /**
   * Get a specific diary entry by ID
   * @param id Entry ID
   * @returns Diary entry or null if not found
   */
  async getEntryById(id: string): Promise<DiaryEntry | null> {
    const entries = await this.getAllEntries();
    return entries.find((entry) => entry.id === id) || null;
  }

  /**
   * Save a new diary entry
   * @param entry Diary entry to save
   */
  async saveEntry(entry: DiaryEntry): Promise<void> {
    try {
      const entries = await this.getAllEntries();
      entries.push(entry);
      await this.saveAllEntries(entries);
    } catch (error) {
      console.error('[DiaryStorageService] Error saving entry:', error);
      throw error;
    }
  }

  /**
   * Update an existing diary entry
   * @param entry Updated diary entry
   */
  async updateEntry(entry: DiaryEntry): Promise<void> {
    try {
      const entries = await this.getAllEntries();
      const index = entries.findIndex((e) => e.id === entry.id);

      if (index === -1) {
        throw new Error(`Entry with id ${entry.id} not found`);
      }

      entries[index] = entry;
      await this.saveAllEntries(entries);
    } catch (error) {
      console.error('[DiaryStorageService] Error updating entry:', error);
      throw error;
    }
  }

  /**
   * Delete a diary entry
   * @param id Entry ID to delete
   */
  async deleteEntry(id: string): Promise<void> {
    try {
      const entries = await this.getAllEntries();
      const filtered = entries.filter((entry) => entry.id !== id);
      await this.saveAllEntries(filtered);
    } catch (error) {
      console.error('[DiaryStorageService] Error deleting entry:', error);
      throw error;
    }
  }

  /**
   * Delete a note from an entry
   * @param entryId Entry ID
   * @param noteId Note ID to delete
   */
  async deleteNote(entryId: string, noteId: string): Promise<void> {
    try {
      const entry = await this.getEntryById(entryId);
      if (!entry) {
        throw new Error(`Entry with id ${entryId} not found`);
      }

      const updatedEntry: DiaryEntry = {
        ...entry,
        notes: entry.notes.filter((note) => note.id !== noteId),
        updatedAt: new Date().toISOString(),
      };

      await this.updateEntry(updatedEntry);
    } catch (error) {
      console.error('[DiaryStorageService] Error deleting note:', error);
      throw error;
    }
  }

  /**
   * Clear all diary entries from storage
   * USE WITH CAUTION - This will delete all diary data!
   */
  async clearAllEntries(): Promise<void> {
    try {
      await Preferences.remove({ key: this.STORAGE_KEY });
    } catch (error) {
      console.error('[DiaryStorageService] Error clearing entries:', error);
      throw error;
    }
  }

  /**
   * Delete all diary entries (alias for clearAllEntries for consistency)
   * USE WITH CAUTION - This will delete all diary data!
   */
  async deleteAllEntries(): Promise<void> {
    await this.clearAllEntries();
  }

  /**
   * Save all entries to storage
   * @param entries Array of entries to save
   */
  private async saveAllEntries(entries: DiaryEntry[]): Promise<void> {
    await Preferences.set({
      key: this.STORAGE_KEY,
      value: JSON.stringify(entries),
    });
  }
}
