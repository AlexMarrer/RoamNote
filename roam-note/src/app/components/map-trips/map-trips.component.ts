import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  OnDestroy,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import {
  IonAccordionGroup,
  IonAccordion,
  IonItem,
  IonLabel,
  IonList,
  IonFabButton,
  IonIcon,
  IonSpinner,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  ModalController,
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { locate, createOutline, trashOutline } from 'ionicons/icons';
import {
  Subject,
  takeUntil,
  debounceTime,
  switchMap,
  firstValueFrom,
} from 'rxjs';
import { GoogleMap } from '@capacitor/google-maps';
import { Position } from '@capacitor/geolocation';
import { environment } from '../../../environments/environment';
import { ThemeService } from '../../shared/services/theme.service';
import { SpotsService, Spot, Trip } from '../../shared/services/spots.service';
import { TripsService } from '../../shared/services/trips.service';
import { PlaceFormModalComponent } from '../place-form-modal/place-form-modal.component';
import { ERROR_MESSAGES } from '../../shared/constants/error-messages';
import {
  TOAST_DURATION,
  TOAST_COLOR,
  TOAST_POSITION,
} from '../../shared/constants/toast-config';

const MAP_CONFIG = {
  DEFAULT_CENTER: { lat: 48.2082, lng: 16.3738 },
  DEFAULT_ZOOM: 12,
  SPOT_FOCUS_ZOOM: 15,
  INIT_DELAY_MS: 300,
} as const;

interface CameraPosition {
  latitude: number;
  longitude: number;
  zoom: number;
}

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#263c3f' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b9a76' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#38414e' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#212a37' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9ca5b3' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#746855' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1f2835' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f3d19c' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#2f3948' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#17263c' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#515c6d' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#17263c' }],
  },
];

@Component({
  selector: 'app-map-trips',
  templateUrl: './map-trips.component.html',
  styleUrls: ['./map-trips.component.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    IonAccordionGroup,
    IonAccordion,
    IonItem,
    IonLabel,
    IonList,
    IonFabButton,
    IonIcon,
    IonSpinner,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
  ],
})
export class MapTripsComponent implements OnInit, OnDestroy {
  @ViewChild('mapRef', { static: true })
  private readonly mapElementRef!: ElementRef<HTMLElement>;

  @ViewChild(IonAccordionGroup, { static: false })
  private readonly accordionGroup?: IonAccordionGroup;

  private googleMap?: GoogleMap;
  private readonly spotToMarkerMap = new Map<string, string>();
  private userPositionMarkerId?: string;
  private readonly destroy$ = new Subject<void>();
  private isRecreatingMap = false;

  private currentCameraPosition: CameraPosition = {
    latitude: MAP_CONFIG.DEFAULT_CENTER.lat,
    longitude: MAP_CONFIG.DEFAULT_CENTER.lng,
    zoom: MAP_CONFIG.DEFAULT_ZOOM,
  };

  trips: ReadonlyArray<Trip> = [];
  debug: string = '';
  isMapLoading = true;

  constructor(
    private readonly themeService: ThemeService,
    private readonly spotsService: SpotsService,
    private readonly tripsService: TripsService,
    private readonly modalController: ModalController,
    private readonly alertController: AlertController,
    private readonly toastController: ToastController
  ) {
    addIcons({ locate, createOutline, trashOutline });
  }

  /**
   * Initializes the map component
   * Loads trips, initializes geolocation, and subscribes to theme changes
   */
  ngOnInit() {
    this.loadTrips();
    this.spotsService.initGeolocation();

    this.spotsService.userPosition$
      .pipe(takeUntil(this.destroy$))
      .subscribe((position) => {
        if (position && this.googleMap) {
          this.updateUserPositionMarker(position);
        }
      });

    this.themeService.darkMode$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe((isDark) => {
        if (this.googleMap) {
          this.updateMapTheme(isDark);
        }
      });
  }

  /**
   * Called when the view is entered
   * Initializes the Google Map with a delay
   */
  public ionViewWillEnter(): void {
    if (this.googleMap) {
      return;
    }

    setTimeout(() => this.initializeMap(), MAP_CONFIG.INIT_DELAY_MS);
  }

  /**
   * Called when the view is left
   * Destroys the map and releases resources
   */
  public ionViewWillLeave(): void {
    this.isMapLoading = true;
    this.destroyMap();
  }

  /**
   * Called when the component is destroyed
   * Completes subscriptions, destroys map, and stops geolocation
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyMap();
    this.spotsService.stopGeolocation();
  }

  private async initializeMap(): Promise<void> {
    try {
      const element = this.mapElementRef.nativeElement;

      if (!element) {
        throw new Error('Map element reference not found');
      }

      const userPosition = this.spotsService.getUserPosition();
      const isFirstLoad =
        this.currentCameraPosition.latitude === MAP_CONFIG.DEFAULT_CENTER.lat &&
        this.currentCameraPosition.longitude === MAP_CONFIG.DEFAULT_CENTER.lng;

      const mapCenter =
        isFirstLoad && userPosition
          ? {
              lat: userPosition.coords.latitude,
              lng: userPosition.coords.longitude,
            }
          : {
              lat: this.currentCameraPosition.latitude,
              lng: this.currentCameraPosition.longitude,
            };

      const isDark = this.themeService.isDarkMode();

      this.googleMap = await GoogleMap.create({
        id: 'roam-note-map',
        element,
        apiKey: environment.googleMapsApiKey,
        config: {
          center: mapCenter,
          zoom: this.currentCameraPosition.zoom,
          styles: isDark ? DARK_MAP_STYLE : [],
        },
      });

      await this.googleMap.setOnCameraIdleListener((event) => {
        this.currentCameraPosition = {
          latitude: event.latitude,
          longitude: event.longitude,
          zoom: event.zoom,
        };
      });

      await this.addAllMarkersToMap();

      const currentPosition = this.spotsService.getUserPosition();
      if (currentPosition) {
        await this.updateUserPositionMarker(currentPosition);
      }

      this.isMapLoading = false;
    } catch (error) {
      this.isMapLoading = false;
      throw error;
    }
  }

  private loadTrips(): void {
    this.spotsService
      .getTrips()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (trips) => {
          const previousTrips = this.trips;
          this.trips = trips;

          if (this.accordionGroup && previousTrips.length === trips.length) {
            setTimeout(() => {
              if (this.accordionGroup) {
                this.accordionGroup.value = undefined;
              }
            }, 100);
          }

          if (this.googleMap) {
            this.addAllMarkersToMap();
          }
        },
        error: () => {},
      });
  }

  private async addAllMarkersToMap(): Promise<void> {
    if (!this.googleMap) {
      return;
    }

    for (const trip of this.trips) {
      for (const spot of trip.spots) {
        await this.addMarkerForSpot(spot);
      }
    }
  }

  private async addMarkerForSpot(spot: Spot): Promise<void> {
    if (!this.googleMap) return;

    const markerId = await this.googleMap.addMarker({
      coordinate: {
        lat: spot.latitude,
        lng: spot.longitude,
      },
      snippet: `${spot.name}${spot.description ? '\n' + spot.description : ''}`,
    });

    this.spotToMarkerMap.set(spot.id, markerId);
  }

  /**
   * Handles clicks on places
   * Centers the camera on the selected place
   * @param spot The clicked place
   */
  async onSpotClick(spot: Spot): Promise<void> {
    if (!this.googleMap) {
      return;
    }

    await this.googleMap.setCamera({
      coordinate: {
        lat: spot.latitude,
        lng: spot.longitude,
      },
      zoom: MAP_CONFIG.SPOT_FOCUS_ZOOM,
      animate: true,
    });
  }

  /**
   * Handles accordion changes
   * Placeholder for future functionality
   */
  onAccordionChange(): void {}

  /**
   * TrackBy function for trip lists
   * @param _index Index of the element
   * @param trip The trip object
   * @returns Unique ID of the trip
   */
  trackByTripId(_index: number, trip: Trip): string {
    return trip.id;
  }

  /**
   * TrackBy function for place lists
   * @param _index Index of the element
   * @param spot The place object
   * @returns Unique ID of the place
   */
  trackBySpotId(_index: number, spot: Spot): string {
    return spot.id;
  }

  /**
   * Centers the camera on the current user position
   */
  async centerOnUserPosition(): Promise<void> {
    const position = this.spotsService.getUserPosition();
    if (!position || !this.googleMap) {
      return;
    }

    await this.googleMap.setCamera({
      coordinate: {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      },
      zoom: MAP_CONFIG.SPOT_FOCUS_ZOOM,
      animate: true,
    });
  }

  private async updateMapTheme(isDark: boolean): Promise<void> {
    if (!this.googleMap || this.isRecreatingMap) return;

    this.isRecreatingMap = true;
    this.destroyMap();
    await this.initializeMap();
    this.isRecreatingMap = false;
  }

  private async updateUserPositionMarker(position: Position): Promise<void> {
    if (!this.googleMap) {
      return;
    }

    if (this.userPositionMarkerId) {
      await this.googleMap.removeMarker(this.userPositionMarkerId);
    }

    this.userPositionMarkerId = await this.googleMap.addMarker({
      coordinate: {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      },
      title: 'Dein Standort',
      iconUrl: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
    });
  }

  private destroyMap(): void {
    if (this.googleMap) {
      this.googleMap.destroy();
      this.googleMap = undefined;
      this.spotToMarkerMap.clear();
      this.userPositionMarkerId = undefined;
    }
  }

  /**
   * Opens the modal to edit a place
   * @param spot The place to edit
   * @param trip The trip the place belongs to
   */
  async editSpot(spot: Spot, trip: Trip): Promise<void> {
    const trips = await firstValueFrom(this.tripsService.getTrips());
    const dbTrip = trips?.find((t) => t.id.toString() === trip.id);
    if (!dbTrip) return;

    const tripPlaces = await firstValueFrom(
      this.tripsService.getTripPlaces(dbTrip.id)
    );
    const tripPlace = tripPlaces?.find((tp) => tp.id.toString() === spot.id);
    if (!tripPlace) return;

    const modal = await this.modalController.create({
      component: PlaceFormModalComponent,
      componentProps: {
        tripId: dbTrip.id,
        tripPlace,
        nextVisitOrder: tripPlaces?.length || 0,
        tripStartDate: dbTrip.start_date,
        tripEndDate: dbTrip.end_date,
      },
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.isEdit && data?.tripPlaceId && data?.placeId) {
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
          next: () => {},
          error: (error) => {
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
    }
  }

  /**
   * Deletes a place after confirmation
   * @param spot The place to delete
   * @param trip The trip the place belongs to
   */
  async deleteSpot(spot: Spot, trip: Trip): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Ort löschen',
      message: `Möchtest du "${spot.name}" wirklich löschen?`,
      buttons: [
        {
          text: 'Abbrechen',
          role: 'cancel',
        },
        {
          text: 'Löschen',
          role: 'destructive',
          handler: async () => {
            const trips = await firstValueFrom(this.tripsService.getTrips());
            const dbTrip = trips?.find((t) => t.id.toString() === trip.id);
            if (!dbTrip) return;

            this.tripsService
              .deleteTripPlace(Number(spot.id), dbTrip.id)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: () => {
                  this.toastController
                    .create({
                      message: 'Ort erfolgreich gelöscht',
                      duration: TOAST_DURATION.SHORT,
                      color: TOAST_COLOR.SUCCESS,
                      position: TOAST_POSITION.BOTTOM,
                    })
                    .then((toast) => toast.present());
                },
                error: (error) => {
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
}
