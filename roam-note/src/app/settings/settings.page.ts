import { Component } from '@angular/core';
import {
  IonContent,
  IonButton,
  IonIcon,
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { trashOutline } from 'ionicons/icons';
import {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from '../shared/constants/error-messages';
import {
  TOAST_DURATION,
  TOAST_POSITION,
  TOAST_COLOR,
} from '../shared/constants/toast-config';
import { HeaderComponent, DiaryService, TripsService } from '../shared';

@Component({
  selector: 'app-settings',
  templateUrl: 'settings.page.html',
  styleUrls: ['settings.page.scss'],
  imports: [IonContent, IonButton, IonIcon, HeaderComponent],
})
export class SettingsPage {
  constructor(
    private readonly diaryService: DiaryService,
    private readonly tripsService: TripsService,
    private readonly alertController: AlertController,
    private readonly toastController: ToastController
  ) {
    addIcons({ trashOutline });
  }

  /**
   * Deletes all data (diary entries, trips, and places)
   * Shows a confirmation dialog before deletion
   */
  async deleteAllData(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Alle Daten löschen?',
      message:
        'Möchtest du wirklich alle Diary-Einträge, Orte und Trips löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
      buttons: [
        {
          text: 'Abbrechen',
          role: 'cancel',
        },
        {
          text: 'Löschen',
          role: 'destructive',
          handler: async () => {
            try {
              // 1. Delete all diary entries
              await this.diaryService.deleteAllEntries();

              // 2. Get all trips
              const trips = await new Promise<any[]>((resolve, reject) => {
                this.tripsService.getTrips().subscribe({
                  next: (data) => resolve(data),
                  error: (err) => reject(err),
                });
              });

              // 3. Delete all trip places
              for (const trip of trips) {
                const tripPlaces = await new Promise<any[]>(
                  (resolve, reject) => {
                    this.tripsService.getTripPlaces(trip.id).subscribe({
                      next: (data) => resolve(data),
                      error: (err) => reject(err),
                    });
                  }
                );

                for (const tripPlace of tripPlaces) {
                  await new Promise<void>((resolve, reject) => {
                    this.tripsService
                      .deleteTripPlace(tripPlace.id, trip.id)
                      .subscribe({
                        next: () => resolve(),
                        error: (err) => reject(err),
                      });
                  });
                }
              }

              // 4. Delete all trips
              for (const trip of trips) {
                await new Promise<void>((resolve, reject) => {
                  this.tripsService.deleteTrip(trip.id).subscribe({
                    next: () => resolve(),
                    error: (err) => reject(err),
                  });
                });
              }

              // Show success message
              const toast = await this.toastController.create({
                message: SUCCESS_MESSAGES.DATA_DELETED,
                duration: TOAST_DURATION.SHORT,
                color: TOAST_COLOR.SUCCESS,
                position: TOAST_POSITION.BOTTOM,
              });
              await toast.present();
            } catch (error) {
              console.error('[SettingsPage] Error deleting data:', error);
              const toast = await this.toastController.create({
                message: ERROR_MESSAGES.DATA_DELETE_FAILED,
                duration: TOAST_DURATION.DEFAULT,
                color: TOAST_COLOR.DANGER,
                position: TOAST_POSITION.BOTTOM,
              });
              await toast.present();
            }
          },
        },
      ],
    });

    await alert.present();
  }
}
