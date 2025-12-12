import { Injectable } from '@angular/core';
import {
  Observable,
  from,
  map,
  BehaviorSubject,
  tap,
  switchMap,
  distinctUntilChanged,
  skip,
  throwError,
  of,
} from 'rxjs';
import { SupabaseService } from './supabase.service';
import { ERROR_MESSAGES } from '../constants/error-messages';
import { NotificationService } from './notification.service';
import { NetworkService } from './network.service';
import { TripsStorageService } from './trips-storage.service';
import { Trip, TripInsert, TripUpdate } from '../models/trip.model';
import { Place, PlaceInsert, PlaceUpdate } from '../models/place.model';
import {
  TripPlace,
  TripPlaceInsert,
  TripPlaceUpdate,
  TripPlaceWithDetails,
} from '../models/trip-place.model';

@Injectable({
  providedIn: 'root',
})
export class TripsService {
  public readonly tripsSubject$ = new BehaviorSubject<Trip[]>([]);
  public readonly trips$ = this.tripsSubject$.asObservable();

  private readonly tripPlacesMap = new Map<
    number,
    BehaviorSubject<TripPlaceWithDetails[]>
  >();

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationService: NotificationService,
    private readonly networkService: NetworkService,
    private readonly tripsStorage: TripsStorageService
  ) {
    this.initializeTrips();

    this.networkService
      .getOnlineStatus()
      .pipe(distinctUntilChanged(), skip(1))
      .subscribe((isOnline) => {
        if (isOnline) {
          this.refreshTrips();
        }
      });
  }

  private initializeTrips(): void {
    this.loadTrips().catch((error) => {
      console.error('[TripsService] Failed to load trips:', error);
    });
  }

  private async loadTrips(): Promise<void> {
    if (!this.networkService.isOnline()) {
      const cachedTrips = await this.tripsStorage.getCachedTrips();
      this.tripsSubject$.next(cachedTrips);
      return;
    }

    const supabase = this.supabaseService.getClient();
    from(
      supabase
        .from('Trip')
        .select('*')
        .order('created_at', { ascending: false })
    )
      .pipe(
        map((response) => {
          if (response.error) {
            console.error(
              '[TripsService] Error fetching trips:',
              response.error
            );
            throw response.error;
          }
          return response.data as Trip[];
        }),
        tap(async (trips) => {
          await this.tripsStorage.cacheTrips(trips);
        })
      )
      .subscribe({
        next: (trips) => {
          this.tripsSubject$.next(trips);
        },
        error: (error) => {
          console.error('[TripsService] Load error:', error);
          this.tripsStorage.getCachedTrips().then((cachedTrips) => {
            if (cachedTrips.length > 0) {
              console.log('[TripsService] ⚠️ Using cached trips due to error');
              this.tripsSubject$.next(cachedTrips);
            }
          });
        },
      });
  }

  /**
   * Updates the trip list by reloading from Supabase
   */
  refreshTrips(): void {
    this.loadTrips().catch((error) => {
      console.error('[TripsService] Refresh failed:', error);
    });
  }

  private checkOnlineOrError<T>(): Observable<void> {
    if (!this.networkService.isOnline()) {
      return throwError(() => new Error(ERROR_MESSAGES.OFFLINE));
    }

    return of(undefined) as Observable<void>;
  }

  // ==================== TRIPS ====================

  /**
   * Returns an observable of trips
   * @returns Observable with all trips
   */
  getTrips(): Observable<Trip[]> {
    return this.trips$;
  }

  /**
   * Loads a specific trip by its ID
   * @param id The trip ID
   * @returns Observable with the trip
   */
  getTripById(id: number): Observable<Trip> {
    const supabase = this.supabaseService.getClient();
    return from(supabase.from('Trip').select('*').eq('id', id).single()).pipe(
      map((response) => {
        if (response.error) {
          console.error('[TripsService] Error fetching trip:', response.error);
          throw response.error;
        }
        return response.data as Trip;
      })
    );
  }

  createTrip(trip: TripInsert): Observable<Trip> {
    return this.checkOnlineOrError().pipe(
      switchMap(() => {
        const supabase = this.supabaseService.getClient();
        return from(supabase.from('Trip').insert(trip).select().single()).pipe(
          map((response) => {
            if (response.error) {
              console.error(
                '[TripsService] Error creating trip:',
                response.error
              );
              throw response.error;
            }
            return response.data as Trip;
          }),
          tap(() => this.refreshTrips())
        );
      })
    );
  }

  /**
   * Updates an existing trip
   * @param id The trip ID
   * @param trip The trip data to update
   * @returns Observable with the updated trip
   */
  updateTrip(id: number, trip: TripUpdate): Observable<Trip> {
    return this.checkOnlineOrError().pipe(
      switchMap(() => {
        const supabase = this.supabaseService.getClient();
        return from(
          supabase.from('Trip').update(trip).eq('id', id).select().single()
        ).pipe(
          map((response) => {
            if (response.error) {
              console.error(
                '[TripsService] Error updating trip:',
                response.error
              );
              throw response.error;
            }
            return response.data as Trip;
          }),
          tap(() => this.refreshTrips())
        );
      })
    );
  }

  /**
   * Deletes a trip
   * @param id The trip ID
   * @returns Observable that completes when deleted
   */
  deleteTrip(id: number): Observable<void> {
    return this.checkOnlineOrError().pipe(
      switchMap(() => {
        const supabase = this.supabaseService.getClient();
        return from(supabase.from('Trip').delete().eq('id', id)).pipe(
          map((response) => {
            if (response.error) {
              console.error(
                '[TripsService] Error deleting trip:',
                response.error
              );
              throw response.error;
            }
          }),
          tap(() => this.refreshTrips())
        );
      })
    );
  }

  // ==================== PLACES ====================

  /**
   * Loads a specific place by its ID
   * @param id The place ID
   * @returns Observable with the place
   */
  getPlaceById(id: number): Observable<Place> {
    const supabase = this.supabaseService.getClient();
    return from(supabase.from('Place').select('*').eq('id', id).single()).pipe(
      map((response) => {
        if (response.error) {
          console.error('[TripsService] Error fetching place:', response.error);
          throw response.error;
        }
        return response.data as Place;
      })
    );
  }

  createPlace(place: PlaceInsert): Observable<Place> {
    return this.checkOnlineOrError().pipe(
      switchMap(() => {
        const supabase = this.supabaseService.getClient();
        return from(
          supabase.from('Place').insert(place).select().single()
        ).pipe(
          map((response) => {
            if (response.error) {
              console.error(
                '[TripsService] Error creating place:',
                response.error
              );
              throw response.error;
            }
            return response.data as Place;
          })
        );
      })
    );
  }

  /**
   * Updates an existing place
   * @param id The place ID
   * @param updates The place data to update
   * @returns Observable with the updated place
   */
  updatePlace(id: number, updates: PlaceUpdate): Observable<Place> {
    return this.checkOnlineOrError().pipe(
      switchMap(() => {
        const supabase = this.supabaseService.getClient();
        return from(
          supabase.from('Place').update(updates).eq('id', id).select().single()
        ).pipe(
          map((response) => {
            if (response.error) {
              console.error(
                '[TripsService] Error updating place:',
                response.error
              );
              throw response.error;
            }
            return response.data as Place;
          })
        );
      })
    );
  }

  // ==================== TRIP PLACES ====================

  /**
   * Returns an observable of a trip's places
   * @param tripId The trip ID
   * @returns Observable with all places of the trip including details
   */
  getTripPlaces(tripId: number): Observable<TripPlaceWithDetails[]> {
    if (!this.tripPlacesMap.has(tripId)) {
      this.tripPlacesMap.set(
        tripId,
        new BehaviorSubject<TripPlaceWithDetails[]>([])
      );
      this.loadTripPlaces(tripId);
    }
    return this.tripPlacesMap.get(tripId)!.asObservable();
  }

  private async loadTripPlaces(tripId: number): Promise<void> {
    if (!this.networkService.isOnline()) {
      const cached = await this.tripsStorage.getCachedTripPlaces(tripId);
      const subject = this.tripPlacesMap.get(tripId);

      if (subject) {
        subject.next(cached);
      }

      return;
    }

    const supabase = this.supabaseService.getClient();
    from(
      supabase
        .from('TripPlace')
        .select(
          `
          *,
          Place (
            name,
            latitude,
            longitude
          )
        `
        )
        .eq('trip_id', tripId)
        .order('visit_order', { ascending: true })
    )
      .pipe(
        map((response) => {
          if (response.error) {
            console.error(
              '[TripsService] Error fetching trip places:',
              response.error
            );
            throw response.error;
          }

          return response.data.map((tp: any) => ({
            id: tp.id,
            trip_id: tp.trip_id,
            place_id: tp.place_id,
            visit_order: tp.visit_order,
            arrival_date: tp.arrival_date,
            departure_date: tp.departure_date,
            is_alert_active: tp.is_alert_active,
            note: tp.note,
            place_name: tp.Place.name,
            place_latitude: tp.Place.latitude,
            place_longitude: tp.Place.longitude,
          })) as TripPlaceWithDetails[];
        }),
        tap(async (tripPlaces) => {
          await this.tripsStorage.cacheTripPlaces(tripId, tripPlaces);
        })
      )
      .subscribe({
        next: (tripPlaces) => {
          const subject = this.tripPlacesMap.get(tripId);
          if (subject) {
            subject.next(tripPlaces);
          }
        },
        error: (error) => {
          console.error('[TripsService] Load TripPlaces error:', error);
          this.tripsStorage
            .getCachedTripPlaces(tripId)
            .then((cachedTripPlaces) => {
              if (cachedTripPlaces.length > 0) {
                console.log(
                  '[TripsService] ⚠️ Using cached trip places due to error'
                );

                const subject = this.tripPlacesMap.get(tripId);
                if (subject) {
                  subject.next(cachedTripPlaces);
                }
              }
            });
        },
      });
  }

  /**
   * Updates the place list of a trip
   * @param tripId The trip ID
   */
  refreshTripPlaces(tripId: number): void {
    this.loadTripPlaces(tripId);
  }

  /**
   * Creates a new trip place and schedules notifications
   * @param tripPlace The trip place data to create
   * @returns Observable with the created trip place
   */
  createTripPlace(tripPlace: TripPlaceInsert): Observable<TripPlace> {
    return this.checkOnlineOrError().pipe(
      switchMap(() => {
        const supabase = this.supabaseService.getClient();
        const data = {
          ...tripPlace,
          is_alert_active: tripPlace.is_alert_active ?? false,
        };
        return from(
          supabase.from('TripPlace').insert(data).select().single()
        ).pipe(
          map((response) => {
            if (response.error) {
              console.error(
                '[TripsService] Error creating trip place:',
                response.error
              );
              throw response.error;
            }

            return response.data as TripPlace;
          }),
          switchMap(async (tripPlace) => {
            const tripPlaceDetails = await this.getTripPlaceWithDetails(
              tripPlace.id
            );
            if (tripPlaceDetails) {
              await this.notificationService.scheduleNotificationForSpot(
                tripPlaceDetails
              );
            }

            return tripPlace;
          }),
          tap((tripPlace) => {
            this.refreshTripPlaces(tripPlace.trip_id);
            this.refreshTrips();
          })
        );
      })
    );
  }

  /**
   * Updates an existing trip place and notifications
   * @param id The trip place ID
   * @param updates The data to update
   * @returns Observable with the updated trip place
   */
  updateTripPlace(id: number, updates: TripPlaceUpdate): Observable<TripPlace> {
    return this.checkOnlineOrError().pipe(
      switchMap(() => {
        const supabase = this.supabaseService.getClient();
        return from(
          supabase
            .from('TripPlace')
            .update(updates)
            .eq('id', id)
            .select()
            .single()
        ).pipe(
          map((response) => {
            if (response.error) {
              console.error(
                '[TripsService] Error updating trip place:',
                response.error
              );
              throw response.error;
            }
            return response.data as TripPlace;
          }),
          switchMap(async (tripPlace) => {
            const tripPlaceDetails = await this.getTripPlaceWithDetails(
              tripPlace.id
            );
            if (tripPlaceDetails) {
              await this.notificationService.updateNotification(
                tripPlaceDetails
              );
            }

            return tripPlace;
          }),
          tap((tripPlace) => {
            this.refreshTripPlaces(tripPlace.trip_id);
            this.refreshTrips();
          })
        );
      })
    );
  }

  /**
   * Deletes a trip place and cancels its notifications
   * @param id The trip place ID
   * @param tripId The trip ID
   * @returns Observable that completes when deleted
   */
  deleteTripPlace(id: number, tripId: number): Observable<void> {
    return this.checkOnlineOrError().pipe(
      switchMap(() => {
        const supabase = this.supabaseService.getClient();
        return from(supabase.from('TripPlace').delete().eq('id', id)).pipe(
          switchMap((response) => {
            if (response.error) {
              console.error(
                '[TripsService] Error deleting trip place:',
                response.error
              );
              throw response.error;
            }
            return from(this.notificationService.cancelNotification(id));
          }),
          tap(() => {
            this.refreshTripPlaces(tripId);
            this.refreshTrips();
          })
        );
      })
    );
  }

  /**
   * Reorders the places of a trip
   * @param tripId The trip ID
   * @param orderedTripPlaceIds Array of trip place IDs in desired order
   * @returns Promise that resolves when reordered
   */
  async reorderTripPlaces(
    tripId: number,
    orderedTripPlaceIds: number[]
  ): Promise<void> {
    if (!this.networkService.isOnline()) {
      throw new Error(ERROR_MESSAGES.OFFLINE);
    }
    const supabase = this.supabaseService.getClient();
    const updates = orderedTripPlaceIds.map((id, index) => ({
      id,
      visit_order: index,
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from('TripPlace')
        .update({ visit_order: update.visit_order })
        .eq('id', update.id)
        .eq('trip_id', tripId);

      if (error) {
        console.error('[TripsService] Error reordering trip places:', error);
        throw error;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 50));

    console.log('[TripsService] Reorder complete, refreshing data');
    this.refreshTripPlaces(tripId);
    this.refreshTrips();
  }

  private async getTripPlaceWithDetails(
    tripPlaceId: number
  ): Promise<TripPlaceWithDetails | null> {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('TripPlace')
      .select(
        `
        *,
        Place (
          name,
          latitude,
          longitude
        )
      `
      )
      .eq('id', tripPlaceId)
      .single();

    if (error) {
      console.error('[TripsService] Error fetching trip place details:', error);
      return null;
    }

    return {
      id: data.id,
      trip_id: data.trip_id,
      place_id: data.place_id,
      visit_order: data.visit_order,
      arrival_date: data.arrival_date,
      departure_date: data.departure_date,
      is_alert_active: data.is_alert_active,
      note: data.note,
      place_name: data.Place.name,
      place_latitude: data.Place.latitude,
      place_longitude: data.Place.longitude,
    } as TripPlaceWithDetails;
  }

  /**
   * Loads all trip places (from all trips)
   * @returns Promise with all trip places
   */
  async getAllTripPlaces(): Promise<TripPlaceWithDetails[]> {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('TripPlace')
      .select(
        `
        *,
        Place (
          name,
          latitude,
          longitude
        )
      `
      )
      .order('visit_order', { ascending: true });

    if (error) {
      console.error('[TripsService] Error fetching all trip places:', error);
      return [];
    }

    return data.map((tp: any) => ({
      id: tp.id,
      trip_id: tp.trip_id,
      place_id: tp.place_id,
      visit_order: tp.visit_order,
      arrival_date: tp.arrival_date,
      departure_date: tp.departure_date,
      is_alert_active: tp.is_alert_active,
      note: tp.note,
      place_name: tp.Place.name,
      place_latitude: tp.Place.latitude,
      place_longitude: tp.Place.longitude,
    })) as TripPlaceWithDetails[];
  }
}
