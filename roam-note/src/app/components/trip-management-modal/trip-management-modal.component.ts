import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ERROR_MESSAGES } from '../../shared/constants/error-messages';
import {
  TOAST_DURATION,
  TOAST_POSITION,
  TOAST_COLOR,
} from '../../shared/constants/toast-config';
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
  ToastController,
} from '@ionic/angular/standalone';
import { Subject, takeUntil, switchMap } from 'rxjs';
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
  arrowBackOutline,
  enterOutline,
  exitOutline,
  notifications,
  addCircle,
  mapOutline,
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
  private readonly tripPlacesDestroy$ = new Subject<void>();

  constructor(
    private readonly modalController: ModalController,
    private readonly alertController: AlertController,
    private readonly toastController: ToastController,
    private readonly tripsService: TripsService
  ) {
    addIcons({
      closeOutline,
      createOutline,
      trashOutline,
      addOutline,
      arrowBackOutline,
      enterOutline,
      exitOutline,
      notifications,
      addCircle,
      mapOutline,
    });
  }

  /**
   * Initializes the trip management modal
   * Loads all available trips
   */
  ngOnInit(): void {
    this.loadTrips();
  }

  /**
   * Called when the component is destroyed
   * Completes all active subscriptions
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.tripPlacesDestroy$.next();
    this.tripPlacesDestroy$.complete();
  }

  /**
   * Closes the modal
   */
  dismiss(): void {
    this.modalController.dismiss();
  }

  private loadTrips(): void {
    this.tripsService
      .getTrips()
      .pipe(takeUntil(this.destroy$))
      .subscribe((trips) => {
        this.trips = trips;
      });
  }

  /**
   * Selects a trip and displays its places
   * @param trip The selected trip
   */
  selectTrip(trip: Trip): void {
    this.tripPlacesDestroy$.next();

    this.selectedTrip = trip;
    this.loadTripPlaces(trip.id);
    this.activePanel = 'details';
  }

  /**
   * Navigates back to the trip overview
   */
  backToTrips(): void {
    this.activePanel = 'trips';
  }

  private loadTripPlaces(tripId: number): void {
    this.tripsService
      .getTripPlaces(tripId)
      .pipe(takeUntil(this.tripPlacesDestroy$))
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

  /**
   * Opens the modal to create or edit a trip
   * @param trip Optional: The trip to edit (if available)
   */
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
              this.toastController
                .create({
                  message: error.message || ERROR_MESSAGES.TRIP_UPDATE_FAILED,
                  duration: TOAST_DURATION.DEFAULT,
                  color: TOAST_COLOR.DANGER,
                  position: TOAST_POSITION.BOTTOM,
                })
                .then((toast) => toast.present());
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
              this.toastController
                .create({
                  message: error.message || ERROR_MESSAGES.TRIP_CREATE_FAILED,
                  duration: TOAST_DURATION.DEFAULT,
                  color: TOAST_COLOR.DANGER,
                  position: TOAST_POSITION.BOTTOM,
                })
                .then((toast) => toast.present());
            },
          });
      }
    }
  }

  /**
   * Opens the modal to edit a trip
   * @param trip The trip to edit
   */
  async editTrip(trip: Trip): Promise<void> {
    await this.openTripModal(trip);
  }

  /**
   * Deletes a trip after confirmation
   * @param trip The trip to delete
   */
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
                  // Auto-updated via BehaviorSubject
                  if (this.selectedTrip?.id === trip.id) {
                    this.selectedTrip = null;
                    this.tripPlaces = [];
                  }
                },
                error: (error) => {
                  console.error(
                    '[TripManagementModal] Error deleting trip:',
                    error
                  );
                  this.toastController
                    .create({
                      message:
                        error.message || ERROR_MESSAGES.TRIP_DELETE_FAILED,
                      duration: TOAST_DURATION.DEFAULT,
                      color: TOAST_COLOR.DANGER,
                      position: TOAST_POSITION.BOTTOM,
                    })
                    .then((toast) => toast.present());
                },
              });
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * Opens the modal to add or edit a place
   * @param tripPlace Optional: The place to edit (if available)
   */
  async openPlaceModal(tripPlace?: TripPlaceWithDetails): Promise<void> {
    if (!this.selectedTrip) {
      return;
    }

    const modal = await this.modalController.create({
      component: PlaceFormModalComponent,
      componentProps: {
        tripId: this.selectedTrip.id,
        tripPlace,
        nextVisitOrder: this.tripPlaces.length,
        tripStartDate: this.selectedTrip.start_date,
        tripEndDate: this.selectedTrip.end_date,
      },
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data) {
      if (data.isEdit && data.tripPlaceId && data.placeId) {
        const tripPlaceUpdates = {
          arrival_date: data.tripPlace.arrival_date,
          departure_date: data.tripPlace.departure_date,
          is_alert_active: data.tripPlace.is_alert_active,
          note: data.tripPlace.note,
        };

        const placeUpdates = {
          name: data.place.name,
          latitude: data.place.latitude,
          longitude: data.place.longitude,
        };

        this.tripsService
          .updatePlace(data.placeId, placeUpdates)
          .pipe(
            switchMap(() =>
              this.tripsService.updateTripPlace(
                data.tripPlaceId,
                tripPlaceUpdates
              )
            ),
            takeUntil(this.destroy$)
          )
          .subscribe({
            next: () => {
              // Auto-updated via BehaviorSubject
            },
            error: (error) => {
              console.error(
                '[TripManagementModal] Error updating place/trip place:',
                error
              );
              this.toastController
                .create({
                  message: error.message || ERROR_MESSAGES.PLACE_UPDATE_FAILED,
                  duration: TOAST_DURATION.DEFAULT,
                  color: TOAST_COLOR.DANGER,
                  position: TOAST_POSITION.BOTTOM,
                })
                .then((toast) => toast.present());
            },
          });
      } else {
        this.tripsService
          .createPlace(data.place)
          .pipe(
            switchMap((newPlace) => {
              const tripPlaceData = {
                ...data.tripPlace,
                place_id: newPlace.id,
              };
              return this.tripsService.createTripPlace(tripPlaceData);
            }),
            takeUntil(this.destroy$)
          )
          .subscribe({
            next: () => {
              // Auto-updated via BehaviorSubject
            },
            error: (error) => {
              console.error(
                '[TripManagementModal] Error creating place/trip place:',
                error
              );
              this.toastController
                .create({
                  message: error.message || ERROR_MESSAGES.PLACE_CREATE_FAILED,
                  duration: TOAST_DURATION.DEFAULT,
                  color: TOAST_COLOR.DANGER,
                  position: TOAST_POSITION.BOTTOM,
                })
                .then((toast) => toast.present());
            },
          });
      }
    }
  }

  /**
   * Opens the modal to edit a place
   * @param tripPlace The place to edit
   */
  async editTripPlace(tripPlace: TripPlaceWithDetails): Promise<void> {
    await this.openPlaceModal(tripPlace);
  }

  /**
   * Deletes a place from a trip after confirmation
   * @param tripPlace The place to delete
   */
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
                  this.toastController
                    .create({
                      message:
                        error.message || ERROR_MESSAGES.PLACE_DELETE_FAILED,
                      duration: TOAST_DURATION.DEFAULT,
                      color: TOAST_COLOR.DANGER,
                      position: TOAST_POSITION.BOTTOM,
                    })
                    .then((toast) => toast.present());
                },
              });
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * Handles reordering of trips
   * @param event CustomEvent with reorder information
   */
  handleReorder(event: CustomEvent): void {
    event.detail.complete();
  }

  /**
   * Handles reordering of places within a trip
   * @param event CustomEvent with reorder information
   */
  handlePlaceReorder(event: CustomEvent): void {
    if (!this.selectedTrip) {
      event.detail.complete();
      return;
    }

    const reorderedItems = [...this.tripPlaces];
    const movedItem = reorderedItems.splice(event.detail.from, 1)[0];
    reorderedItems.splice(event.detail.to, 0, movedItem);
    const orderedIds = reorderedItems.map((tp) => tp.id);

    event.detail.complete();

    this.tripsService
      .reorderTripPlaces(this.selectedTrip.id, orderedIds)
      .then(() => {
        // Auto-updated via BehaviorSubject
      })
      .catch((error) => {
        console.error(
          '[TripManagementModal] Error reordering trip places:',
          error
        );
      });
  }

  /**
   * Formats a date for display
   * @param dateString ISO date string
   * @returns Formatted date (e.g., "01.01.2024")
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
