import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonIcon,
  IonCard,
  IonCardContent,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { close, add, createOutline, trashOutline } from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import { DiaryService } from '../../shared/services/diary.service';
import {
  DiaryEntryWithDetails,
  DiaryNoteWithDetails,
} from '../../shared/models/diary-entry.model';
import { DiaryNoteFormModalComponent } from '../diary-note-form-modal/diary-note-form-modal.component';

@Component({
  selector: 'app-diary-entry-modal',
  templateUrl: './diary-entry-modal.component.html',
  styleUrls: ['./diary-entry-modal.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonIcon,
    IonCard,
    IonCardContent,
  ],
})
export class DiaryEntryModalComponent implements OnInit {
  @Input() entry?: DiaryEntryWithDetails;

  date = '';
  dateInput = ''; // For ion-input type="date" (YYYY-MM-DD)
  title = '';
  maxDate = '';
  isEditMode = false;

  constructor(
    private readonly modalController: ModalController,
    private readonly diaryService: DiaryService
  ) {
    addIcons({ close, add, createOutline, trashOutline });
  }

  /**
   * Initializes the diary entry modal
   * Sets date and edit mode
   */
  ngOnInit(): void {
    // Set max date to today (YYYY-MM-DD format for ion-input)
    this.maxDate = new Date().toISOString().split('T')[0];

    if (this.entry) {
      // Edit mode
      this.isEditMode = true;
      this.date = this.entry.date;
      this.dateInput = this.entry.date;
      this.title = this.entry.title || '';
    } else {
      // Create mode - default to today
      this.dateInput = this.maxDate;
      this.date = this.maxDate;
    }
  }

  /**
   * Closes the modal
   */
  dismiss(): void {
    this.modalController.dismiss();
  }

  /**
   * Saves the entry (creates or updates)
   * Stays in modal after creation to add notes
   */
  async save(): Promise<void> {
    if (!this.dateInput) {
      return;
    }

    try {
      if (this.isEditMode && this.entry) {
        // Update existing entry
        await this.diaryService.updateEntry(this.entry.id, {
          title: this.title || undefined,
        });
        this.modalController.dismiss({ saved: true });
      } else {
        // Create new entry
        const createdEntry = await this.diaryService.createEntry({
          date: this.dateInput,
          title: this.title || undefined,
        });

        // Switch to edit mode instead of closing modal
        // This keeps the user in the flow to add notes immediately
        this.isEditMode = true;
        this.date = this.dateInput;

        // Load the newly created entry with full details
        const entries = await firstValueFrom(
          this.diaryService.getDiaryEntries$()
        );
        const loadedEntry = entries.find((e) => e.id === createdEntry.id);
        if (loadedEntry) {
          this.entry = loadedEntry;
        }
      }
    } catch (error) {
      console.error('[DiaryEntryModal] Error saving entry:', error);
    }
  }
  /**
   * Deletes the diary entry
   */
  async deleteEntry(): Promise<void> {
    if (!this.entry) {
      return;
    }

    try {
      await this.diaryService.deleteEntry(this.entry.id);
      this.modalController.dismiss({ deleted: true });
    } catch (error) {
      console.error('[DiaryEntryModal] Error deleting entry:', error);
    }
  }

  /**
   * Opens a modal to add a new note
   * Saves the entry first if not yet created
   */
  async addNote(): Promise<void> {
    if (!this.entry) {
      // If creating a new entry, save it first
      await this.save();
      return;
    }

    const modal = await this.modalController.create({
      component: DiaryNoteFormModalComponent,
      componentProps: {
        entryId: this.entry.id,
      },
    });

    await modal.present();

    // Refresh entry after note is added
    const { data } = await modal.onDidDismiss();
    if (data?.saved && this.entry) {
      // Reload the entry to get updated notes
      await this.reloadEntry();
    }
  }

  /**
   * Opens a modal to edit a note
   * @param note The note to edit
   */
  async editNote(note: DiaryNoteWithDetails): Promise<void> {
    if (!this.entry) {
      return;
    }

    const modal = await this.modalController.create({
      component: DiaryNoteFormModalComponent,
      componentProps: {
        entryId: this.entry.id,
        note,
      },
    });

    await modal.present();

    // Refresh entry after note is edited
    const { data } = await modal.onDidDismiss();
    if (data?.saved && this.entry) {
      // Reload the entry to get updated notes
      await this.reloadEntry();
    }
  }

  /**
   * Reload the current entry from the service
   */
  private async reloadEntry(): Promise<void> {
    if (!this.entry) {
      return;
    }

    try {
      const entries = await firstValueFrom(
        this.diaryService.getDiaryEntries$()
      );
      const updatedEntry = entries.find((e) => e.id === this.entry!.id);
      if (updatedEntry) {
        this.entry = updatedEntry;
      }
    } catch (error) {
      console.error('[DiaryEntryModal] Error reloading entry:', error);
    }
  }

  /**
   * Deletes a note
   * @param note The note to delete
   */
  async deleteNote(note: DiaryNoteWithDetails): Promise<void> {
    if (!this.entry) {
      return;
    }

    try {
      await this.diaryService.deleteNote(this.entry.id, note.id);
      // Reload entry after note deletion
      await this.reloadEntry();
    } catch (error) {
      console.error('[DiaryEntryModal] Error deleting note:', error);
    }
  }

  /**
   * Formats a time for display
   * @param dateString ISO date string with time component
   * @returns Formatted time (e.g., "14:30")
   */
  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Formats a date for display in the header
   * @param dateString ISO date string
   * @returns Formatted date (e.g., "Monday, January 1, 2024")
   */
  formatDateForDisplay(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  /**
   * Formats a date for display in the input field (DD.MM.YYYY)
   * @param dateString ISO date string
   * @returns Formatted date (e.g., "01.01.2024")
   */
  formatDateInput(dateString: string): string {
    if (!dateString) {
      return '';
    }
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
