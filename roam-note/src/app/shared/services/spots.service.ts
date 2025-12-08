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

  async initGeolocation(): Promise<void> {
    try {
      let permission = await Geolocation.checkPermissions();

      if (
        permission.location === 'prompt' ||
        permission.location === 'prompt-with-rationale'
      ) {
        permission = await Geolocation.requestPermissions();
      }

      if (permission.location !== 'granted') {
        console.warn('[SpotsService] Location permission denied');
        return;
      }

      try {
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        });
        this.userPositionSubject.next(position);
        console.log('[SpotsService] Initial position acquired');
      } catch (error_) {
        console.warn('[SpotsService] getCurrentPosition failed:', error_);
      }

      this.watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        },
        (position, err) => {
          this.ngZone.run(() => {
            if (err) {
              console.error('[SpotsService] Watch position error:', err);
              return;
            }
            if (position) {
              console.log('[SpotsService] Position updated:', {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
              });
              this.userPositionSubject.next(position);
            }
          });
        }
      );
      console.log('[SpotsService] Position watching started');
    } catch (error) {
      console.error('[SpotsService] Geolocation init failed:', error);
    }
  }

  async stopGeolocation(): Promise<void> {
    if (this.watchId) {
      await Geolocation.clearWatch({ id: this.watchId });
      this.watchId = null;
    }
  }

  getUserPosition(): Position | null {
    return this.userPositionSubject.value;
  }

  getTrips(): Observable<ReadonlyArray<MapTrip>> {
    return this.tripsService.getTrips().pipe(
      switchMap((dbTrips) => {
        if (dbTrips.length === 0) {
          return of([]);
        }

        // Combine all trip places observables
        const tripPlacesObservables = dbTrips.map((trip) =>
          this.tripsService.getTripPlaces(trip.id).pipe(
            map((tripPlaces) => {
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
            })
          )
        );

        return combineLatest(tripPlacesObservables);
      })
    );
  }
}

export type { MapSpot as Spot, MapTrip as Trip };
