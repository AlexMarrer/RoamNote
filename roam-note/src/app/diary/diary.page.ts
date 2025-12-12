import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  ModalController,
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { add, calendarOutline, locationOutline } from 'ionicons/icons';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HeaderComponent } from '../shared';
import { DiaryService } from '../shared/services/diary.service';
import { DiaryEntryWithDetails } from '../shared/models/diary-entry.model';
import { DiaryEntryModalComponent } from '../components/diary-entry-modal/diary-entry-modal.component';

@Component({
  selector: 'app-diary',
  templateUrl: 'diary.page.html',
  styleUrls: ['diary.page.scss'],
  imports: [
    CommonModule,
    IonContent,
    IonFab,
    IonFabButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    HeaderComponent,
  ],
})
export class DiaryPage implements OnInit, OnDestroy {
  entries: DiaryEntryWithDetails[] = [];
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly diaryService: DiaryService,
    private readonly modalController: ModalController
  ) {
    addIcons({ add, calendarOutline, locationOutline });
  }

  /**
   * Initializes the diary page
   * Loads all diary entries
   */
  ngOnInit(): void {
    this.loadEntries();
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
   * Loads diary entries with reactive updates
   * Subscribes to the diary service for automatic updates
   */
  private loadEntries(): void {
    this.diaryService
      .getDiaryEntries$()
      .pipe(takeUntil(this.destroy$))
      .subscribe((entries) => {
        this.entries = entries;
      });
  }

  /**
   * Opens a modal to create a new diary entry
   */
  async openCreateEntryModal(): Promise<void> {
    const modal = await this.modalController.create({
      component: DiaryEntryModalComponent,
    });

    await modal.present();
  }

  /**
   * Opens a modal to edit a diary entry
   * @param entry The diary entry to edit
   */
  async openEditEntryModal(entry: DiaryEntryWithDetails): Promise<void> {
    const modal = await this.modalController.create({
      component: DiaryEntryModalComponent,
      componentProps: {
        entry,
      },
    });

    await modal.present();
  }

  /**
   * Formats a date for display
   * @param dateString ISO date string (YYYY-MM-DD)
   * @returns Formatted date in German format (e.g., "Montag, 1. Januar 2024")
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
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
}
