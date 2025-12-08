import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ModalController,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonReorderGroup,
  IonReorder,
  IonBadge,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  AlertController,
} from '@ionic/angular/standalone';
import { Subject, takeUntil } from 'rxjs';
import { TripsService } from '../../shared/services/trips.service';
import { Trip } from '../../shared/models/trip.model';
import { TripPlaceWithDetails } from '../../shared/models/trip-place.model';
import { TripFormModalComponent } from '../trip-form-modal/trip-form-modal.component';
import { PlaceFormModalComponent } from '../place-form-modal/place-form-modal.component';
import {
  addOutline,
  closeOutline,
  createOutline,
  trashOutline,
} from 'ionicons/icons';
import { addIcons } from 'ionicons';

@Component({
  selector: 'app-trip-management-modal',
  templateUrl: './trip-management-modal.component.html',
  styleUrls: ['./trip-management-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonReorderGroup,
    IonReorder,
    IonBadge,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
  ],
})
export class TripManagementModalComponent implements OnInit, OnDestroy {
  trips: Trip[] = [];
  selectedTrip: Trip | null = null;
  tripPlaces: TripPlaceWithDetails[] = [];
  activePanel: 'trips' | 'details' = 'trips';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly modalController: ModalController,
    private readonly alertController: AlertController,
    private readonly tripsService: TripsService
  ) {
    addIcons({ addOutline, closeOutline, createOutline, trashOutline });
  }

  ngOnInit(): void {
    this.loadTrips();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  dismiss(): void {
    this.modalController.dismiss();
  }

  private loadTrips(): void {
    this.tripsService
      .getTrips()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (trips) => {
          this.trips = trips;
          if (trips.length > 0 && !this.selectedTrip) {
            this.selectTrip(trips[0]);
          }
        },
        error: (error) => {
          console.error('[TripManagementModal] Error loading trips:', error);
        },
      });
  }

  selectTrip(trip: Trip): void {
    this.selectedTrip = trip;
    this.loadTripPlaces(trip.id);
    this.activePanel = 'details';
  }

  backToTrips(): void {
    this.activePanel = 'trips';
  }

  private loadTripPlaces(tripId: number): void {
    this.tripsService
      .getTripPlaces(tripId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tripPlaces) => {
          this.tripPlaces = tripPlaces;
        },
        error: (error) => {
          console.error(
            '[TripManagementModal] Error loading trip places:',
            error
          );
        },
      });
  }

  async openTripModal(trip?: Trip): Promise<void> {
    const modal = await this.modalController.create({
      component: TripFormModalComponent,
      componentProps: {
        trip,
      },
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data) {
      if (data.isEdit && data.tripId) {
        this.tripsService
          .updateTrip(data.tripId, data.trip)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              // Auto-updated via BehaviorSubject
            },
            error: (error) => {
              console.error(
                '[TripManagementModal] Error updating trip:',
                error
              );
            },
          });
      } else {
        this.tripsService
          .createTrip(data.trip)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (newTrip) => {
              // Auto-updated via BehaviorSubject
              this.selectTrip(newTrip);
            },
            error: (error) => {
              console.error(
                '[TripManagementModal] Error creating trip:',
                error
              );
            },
          });
      }
    }
  }

  async editTrip(trip: Trip): Promise<void> {
    await this.openTripModal(trip);
  }

  async deleteTrip(trip: Trip): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Trip löschen',
      message: `Möchtest du "${trip.name}" wirklich löschen? Alle Orte werden ebenfalls entfernt.`,
      buttons: [
        {
          text: 'Abbrechen',
          role: 'cancel',
        },
        {
          text: 'Löschen',
          role: 'destructive',
          handler: () => {
            this.tripsService
              .deleteTrip(trip.id)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: () => {
                  if (this.selectedTrip?.id === trip.id) {
                    this.selectedTrip = null;
                    this.tripPlaces = [];
                  }
                  // Auto-updated via BehaviorSubject
                },
                error: (error) => {
                  console.error(
                    '[TripManagementModal] Error deleting trip:',
                    error
                  );
                },
              });
          },
        },
      ],
    });

    await alert.present();
  }

  async openPlaceModal(tripPlace?: TripPlaceWithDetails): Promise<void> {
    if (!this.selectedTrip) {
      console.warn('[TripManagementModal] No trip selected');
      return;
    }

    const modal = await this.modalController.create({
      component: PlaceFormModalComponent,
      componentProps: {
        tripId: this.selectedTrip.id,
        tripPlace,
        nextVisitOrder: this.tripPlaces.length,
      },
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data) {
      if (data.isEdit && data.tripPlaceId) {
        // Update existing TripPlace
        const tripPlaceUpdates = {
          arrival_date: data.tripPlace.arrival_date,
          departure_date: data.tripPlace.departure_date,
          is_alert_active: data.tripPlace.is_alert_active,
          note: data.tripPlace.note,
        };

        this.tripsService
          .updateTripPlace(data.tripPlaceId, tripPlaceUpdates)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              // Auto-updated via BehaviorSubject
            },
            error: (error) => {
              console.error(
                '[TripManagementModal] Error updating trip place:',
                error
              );
            },
          });
      } else {
        // Create new Place and TripPlace
        this.tripsService
          .createPlace(data.place)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (newPlace) => {
              const tripPlaceData = {
                ...data.tripPlace,
                place_id: newPlace.id,
              };

              this.tripsService
                .createTripPlace(tripPlaceData)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                  next: () => {
                    // Auto-updated via BehaviorSubject
                  },
                  error: (error) => {
                    console.error(
                      '[TripManagementModal] Error creating trip place:',
                      error
                    );
                  },
                });
            },
            error: (error) => {
              console.error(
                '[TripManagementModal] Error creating place:',
                error
              );
            },
          });
      }
    }
  }

  async editTripPlace(tripPlace: TripPlaceWithDetails): Promise<void> {
    await this.openPlaceModal(tripPlace);
  }

  async deleteTripPlace(tripPlace: TripPlaceWithDetails): Promise<void> {
    if (!this.selectedTrip) {
      return;
    }

    const alert = await this.alertController.create({
      header: 'Ort löschen',
      message: `Möchtest du "${tripPlace.place_name}" wirklich aus diesem Trip entfernen?`,
      buttons: [
        {
          text: 'Abbrechen',
          role: 'cancel',
        },
        {
          text: 'Löschen',
          role: 'destructive',
          handler: () => {
            this.tripsService
              .deleteTripPlace(tripPlace.id, this.selectedTrip!.id)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: () => {
                  // Auto-updated via BehaviorSubject
                },
                error: (error) => {
                  console.error(
                    '[TripManagementModal] Error deleting trip place:',
                    error
                  );
                },
              });
          },
        },
      ],
    });

    await alert.present();
  }

  handleReorder(event: CustomEvent): void {
    // Trips können noch nicht neu geordnet werden (keine visit_order Spalte in Trip-Tabelle)
    // Diese Funktionalität könnte später hinzugefügt werden wenn gewünscht
    event.detail.complete();
  }

  handlePlaceReorder(event: CustomEvent): void {
    if (!this.selectedTrip) {
      event.detail.complete();
      return;
    }

    const movedItem = this.tripPlaces.splice(event.detail.from, 1)[0];
    this.tripPlaces.splice(event.detail.to, 0, movedItem);

    const orderedIds = this.tripPlaces.map((tp) => tp.id);

    this.tripsService
      .reorderTripPlaces(this.selectedTrip.id, orderedIds)
      .then(() => {
        // Success - BehaviorSubject auto-updates
      })
      .catch((error) => {
        console.error(
          '[TripManagementModal] Error reordering trip places:',
          error
        );
        // Revert optimistic update - BehaviorSubject will auto-refresh
      });

    event.detail.complete();
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
