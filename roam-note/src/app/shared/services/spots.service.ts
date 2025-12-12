import { Injectable, NgZone } from '@angular/core';
import { Geolocation, Position } from '@capacitor/geolocation';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  map,
  of,
  switchMap,
} from 'rxjs';
import { TripsService } from './trips.service';

interface MapSpot {
  readonly id: string;
  readonly name: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly description?: string;
}

interface MapTrip {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly spots: ReadonlyArray<MapSpot>;
}

@Injectable({
  providedIn: 'root',
})
export class SpotsService {
  private readonly userPositionSubject = new BehaviorSubject<Position | null>(
    null
  );
  public readonly userPosition$: Observable<Position | null> =
    this.userPositionSubject.asObservable();

  private watchId: string | null = null;

  constructor(
    private readonly ngZone: NgZone,
    private readonly tripsService: TripsService
  ) {}

  private geolocationInitialized = false;

  /**
   * Requests location permissions from the user
   * @returns true if permission was granted
   */
  async requestLocationPermission(): Promise<boolean> {
    try {
      let permission = await Geolocation.checkPermissions();

      if (
        permission.location === 'prompt' ||
        permission.location === 'prompt-with-rationale'
      ) {
        permission = await Geolocation.requestPermissions();
      }

      return permission.location === 'granted';
    } catch (error) {
      console.error('[SpotsService] Permission request failed:', error);
      return false;
    }
  }

  /**
   * Initializes geolocation and starts position tracking
   */
  async initGeolocation(): Promise<void> {
    if (this.geolocationInitialized) {
      console.log('[SpotsService] Geolocation already initialized');
      return;
    }

    try {
      const hasPermission = await this.requestLocationPermission();

      if (!hasPermission) {
        console.error('[SpotsService] ❌ Location permission denied by user');
        return;
      }

      console.log('[SpotsService] ✅ Location permission granted');

      try {
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000, // Längeres Timeout für Emulator
          maximumAge: 0, // Keine gecachte Position verwenden
        });
        this.userPositionSubject.next(position);
        console.log('[SpotsService] ✅ Initial position acquired:', {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      } catch (error_) {
        console.error('[SpotsService] ❌ getCurrentPosition failed:', error_);
        console.log('[SpotsService] Tip: Emulator needs manual location setup');
      }

      this.watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        },
        (position, err) => {
          this.ngZone.run(() => {
            if (err) {
              console.error('[SpotsService] ❌ Watch position error:', err);
              return;
            }
            if (position) {
              console.log('[SpotsService] ✅ Position updated:', {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
              });
              this.userPositionSubject.next(position);
            }
          });
        }
      );
      console.log('[SpotsService] ✅ Position watching started');
      this.geolocationInitialized = true;
    } catch (error) {
      console.error('[SpotsService] ❌ Geolocation init failed:', error);
    }
  }

  /**
   * Stops position tracking
   */
  async stopGeolocation(): Promise<void> {
    if (this.watchId) {
      await Geolocation.clearWatch({ id: this.watchId });
      this.watchId = null;
    }
  }

  /**
   * Returns the current user position
   * @returns The current position or null
   */
  getUserPosition(): Position | null {
    return this.userPositionSubject.value;
  }

  /**
   * Returns an observable of trips with their places
   * @returns Observable with trips including spots
   */
  getTrips(): Observable<ReadonlyArray<MapTrip>> {
    return this.tripsService.getTrips().pipe(
      switchMap((dbTrips) => {
        if (dbTrips.length === 0) {
          return of([]);
        }

        // Combine all trip places observables
        const tripPlacesObservables = dbTrips.map((trip) =>
          this.tripsService
            .getTripPlaces(trip.id)
            .pipe(map((tripPlaces) => this.mapTripWithPlaces(trip, tripPlaces)))
        );

        return combineLatest(tripPlacesObservables);
      })
    );
  }

  private mapTripWithPlaces(trip: any, tripPlaces: any[]): MapTrip {
    const spots: MapSpot[] = (tripPlaces || []).map((tp) => ({
      id: tp.id.toString(),
      name: tp.place_name,
      latitude: Number(tp.place_latitude),
      longitude: Number(tp.place_longitude),
      description: tp.note,
    }));

    return {
      id: trip.id.toString(),
      name: trip.name,
      description: trip.note,
      spots,
    } as MapTrip;
  }
}

export type { MapSpot as Spot, MapTrip as Trip };
