import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  AfterViewInit,
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
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { locate } from 'ionicons/icons';
import { Subject, takeUntil } from 'rxjs';
import { GoogleMap } from '@capacitor/google-maps';
import { Position } from '@capacitor/geolocation';
import { environment } from '../../../environments/environment';
import { ThemeService } from '../../shared/services/theme.service';
import { SpotsService, Spot, Trip } from '../../shared/services/spots.service';

const MAP_CONFIG = {
  DEFAULT_CENTER: { lat: 48.2082, lng: 16.3738 },
  DEFAULT_ZOOM: 12,
  SPOT_FOCUS_ZOOM: 15,
  INIT_DELAY_MS: 300,
} as const;

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
  ],
})
export class MapTripsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapRef', { static: true })
  private readonly mapElementRef!: ElementRef<HTMLElement>;

  private googleMap?: GoogleMap;
  private readonly spotToMarkerMap = new Map<string, string>();
  private userPositionMarkerId?: string;
  private readonly destroy$ = new Subject<void>();

  trips: ReadonlyArray<Trip> = [];
  debug: string = '';

  constructor(
    private readonly themeService: ThemeService,
    private readonly spotsService: SpotsService
  ) {
    addIcons({ locate });
  }

  ngOnInit() {
    this.loadTrips();
    this.spotsService.initGeolocation();

    // Subscribe to user position updates early
    this.spotsService.userPosition$
      .pipe(takeUntil(this.destroy$))
      .subscribe((position) => {
        if (position && this.googleMap) {
          this.updateUserPositionMarker(position);
        }
      });

    // Subscribe to theme changes ONCE (not in initializeMap to avoid loop)
    this.themeService.darkMode$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isDark) => {
        if (this.googleMap) {
          this.updateMapTheme(isDark);
        }
      });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initializeMap(), MAP_CONFIG.INIT_DELAY_MS);
  }

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
      const mapCenter = userPosition
        ? {
            lat: userPosition.coords.latitude,
            lng: userPosition.coords.longitude,
          }
        : MAP_CONFIG.DEFAULT_CENTER;

      const isDark = this.themeService.isDarkMode();

      this.googleMap = await GoogleMap.create({
        id: 'roam-note-map',
        element,
        apiKey: environment.googleMapsApiKey,
        config: {
          center: mapCenter,
          zoom: MAP_CONFIG.DEFAULT_ZOOM,
          // Empty array for light mode, DARK_MAP_STYLE for dark mode
          styles: isDark ? DARK_MAP_STYLE : [],
        },
      });

      await this.addAllMarkersToMap();

      // Update user position if already available
      const currentPosition = this.spotsService.getUserPosition();
      if (currentPosition) {
        await this.updateUserPositionMarker(currentPosition);
      }

      console.log('[MapTrips] Map initialized successfully');
    } catch (error) {
      console.error('[MapTrips] Failed to initialize map:', error);
      throw error;
    }
  }

  private loadTrips(): void {
    this.spotsService
      .getTrips()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (trips) => {
          this.trips = trips;
          if (this.googleMap) {
            this.addAllMarkersToMap();
          }
        },
        error: (error) => {
          console.error('[MapTrips] Error loading trips:', error);
        },
      });
  }

  private async addAllMarkersToMap(): Promise<void> {
    if (!this.googleMap) {
      console.warn('[MapTrips] Cannot add markers: Map not initialized');
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

    try {
      const markerId = await this.googleMap.addMarker({
        coordinate: {
          lat: spot.latitude,
          lng: spot.longitude,
        },
        snippet: `${spot.name}${
          spot.description ? '\n' + spot.description : ''
        }`,
      });

      this.spotToMarkerMap.set(spot.id, markerId);
    } catch (error) {
      console.error(
        `[MapTrips] Failed to add marker for spot ${spot.id}:`,
        error
      );
    }
  }

  async onSpotClick(spot: Spot): Promise<void> {
    if (!this.googleMap) {
      console.warn('[MapTrips] Cannot focus spot: Map not initialized');
      return;
    }

    try {
      await this.googleMap.setCamera({
        coordinate: {
          lat: spot.latitude,
          lng: spot.longitude,
        },
        zoom: MAP_CONFIG.SPOT_FOCUS_ZOOM,
        animate: true,
      });

      console.log(`[MapTrips] Focused on spot: ${spot.name}`);
    } catch (error) {
      console.error(`[MapTrips] Failed to focus on spot ${spot.id}:`, error);
    }
  }

  onAccordionChange(event: CustomEvent): void {
    // Could be used to auto-focus map on trip selection
  }

  async centerOnUserPosition(): Promise<void> {
    const position = this.spotsService.getUserPosition();
    if (!position || !this.googleMap) {
      console.warn('[MapTrips] Cannot center: No position or map unavailable');
      return;
    }

    try {
      await this.googleMap.setCamera({
        coordinate: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        },
        zoom: MAP_CONFIG.SPOT_FOCUS_ZOOM,
        animate: true,
      });
    } catch (error) {
      console.error('[MapTrips] Failed to center on user position:', error);
    }
  }

  private async updateMapTheme(isDark: boolean): Promise<void> {
    if (!this.googleMap) return;

    try {
      console.log(
        `[MapTrips] Theme changed to ${
          isDark ? 'dark' : 'light'
        }, recreating map...`
      );

      // Destroy and recreate map with new theme
      this.destroyMap();
      await this.initializeMap();
    } catch (error) {
      console.error('[MapTrips] Failed to update map theme:', error);
    }
  }

  private async updateUserPositionMarker(position: Position): Promise<void> {
    if (!this.googleMap) {
      this.debug =
        '[MapTrips] Cannot update user position marker: Map not initialized';
      return;
    }

    try {
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

      this.debug = '[MapTrips] User position marker updated';
      console.log('[MapTrips] User position marker updated');
    } catch (error) {
      this.debug = '[MapTrips] Failed to update user position marker';
      console.error('[MapTrips] Failed to update user position:', error);
    }
  }

  private destroyMap(): void {
    if (this.googleMap) {
      this.googleMap.destroy();
      this.googleMap = undefined;
      this.spotToMarkerMap.clear();
      this.userPositionMarkerId = undefined;
      console.log('[MapTrips] Map destroyed');
    }
  }
}
