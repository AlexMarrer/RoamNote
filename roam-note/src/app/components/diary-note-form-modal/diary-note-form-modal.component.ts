import { Component, OnInit, Input, OnDestroy } from '@angular/core';
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
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonIcon,
  IonChip,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { close, locationOutline } from 'ionicons/icons';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DiaryService } from '../../shared/services/diary.service';
import {
  DiaryNoteWithDetails,
  SpotWithTrip,
} from '../../shared/models/diary-entry.model';

@Component({
  selector: 'app-diary-note-form-modal',
  templateUrl: './diary-note-form-modal.component.html',
  styleUrls: ['./diary-note-form-modal.component.scss'],
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
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonIcon,
    IonChip,
  ],
})
export class DiaryNoteFormModalComponent implements OnInit, OnDestroy {
  @Input() entryId!: string;
  @Input() note?: DiaryNoteWithDetails;

  content = '';
  selectedSpotIds: number[] = [];
  availableSpots: SpotWithTrip[] = [];
  isEditMode = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly modalController: ModalController,
    private readonly diaryService: DiaryService
  ) {
    addIcons({ close, locationOutline });
  }

  /**
   * Initializes the note form modal
   * Loads available places and sets edit mode
   */
  ngOnInit(): void {
    this.loadAvailableSpots();

    if (this.note) {
      // Edit mode
      this.isEditMode = true;
      this.content = this.note.content;
      this.selectedSpotIds = [...this.note.spotIds];
    }
  }

  /**
   * Called when the component is destroyed
   * Completes all active subscriptions
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load all available spots from trips
   */
  private loadAvailableSpots(): void {
    this.diaryService
      .getAllSpots$()
      .pipe(takeUntil(this.destroy$))
      .subscribe((spots) => {
        this.availableSpots = spots;
      });
  }

  /**
   * Closes the modal
   */
  dismiss(): void {
    this.modalController.dismiss();
  }

  /**
   * Saves the note (creates or updates)
   */
  async save(): Promise<void> {
    if (!this.content.trim()) {
      return;
    }

    try {
      if (this.isEditMode && this.note) {
        // Update existing note
        await this.diaryService.updateNote(this.entryId, this.note.id, {
          content: this.content,
          spotIds: this.selectedSpotIds,
        });
      } else {
        // Create new note
        await this.diaryService.addNoteToEntry(this.entryId, {
          content: this.content,
          spotIds: this.selectedSpotIds,
        });
      }

      this.modalController.dismiss({ saved: true });
    } catch (error) {
      console.error('[DiaryNoteFormModal] Error saving note:', error);
    }
  }

  /**
   * Returns the display text for a place in the selection
   * @param spot The place with trip information
   * @returns Formatted text (e.g., "Trip Name - Place (01.01.2024)")
   */
  getSpotDisplayText(spot: SpotWithTrip): string {
    const date = spot.arrivalDate
      ? new Date(spot.arrivalDate).toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : '';

    return date
      ? `${spot.tripName} - ${spot.name} (${date})`
      : `${spot.tripName} - ${spot.name}`;
  }

  /**
   * Returns the selected places
   * @returns Array of selected places
   */
  getSelectedSpots(): SpotWithTrip[] {
    return this.availableSpots.filter((spot) =>
      this.selectedSpotIds.includes(spot.id)
    );
  }

  /**
   * Removes a place from the selection
   * @param spotId ID of the place to remove
   */
  removeSpot(spotId: number): void {
    this.selectedSpotIds = this.selectedSpotIds.filter((id) => id !== spotId);
  }
}
