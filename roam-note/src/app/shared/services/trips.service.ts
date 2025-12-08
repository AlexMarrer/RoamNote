import { Injectable } from '@angular/core';
import { Observable, from, map, BehaviorSubject, tap, switchMap } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { NotificationService } from './notification.service';
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
  private readonly tripsSubject$ = new BehaviorSubject<Trip[]>([]);
  public readonly trips$ = this.tripsSubject$.asObservable();

  private readonly tripPlacesMap = new Map<
    number,
    BehaviorSubject<TripPlaceWithDetails[]>
  >();

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationService: NotificationService
  ) {
    this.loadTrips();
  }

  private loadTrips(): void {
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
        })
      )
      .subscribe({
        next: (trips) => {
          this.tripsSubject$.next(trips);
        },
        error: (error) => console.error('[TripsService] Load error:', error),
      });
  }

  refreshTrips(): void {
    this.loadTrips();
  }

  // ==================== TRIPS ====================

  getTrips(): Observable<Trip[]> {
    return this.trips$;
  }

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
    const supabase = this.supabaseService.getClient();
    return from(supabase.from('Trip').insert(trip).select().single()).pipe(
      map((response) => {
        if (response.error) {
          console.error('[TripsService] Error creating trip:', response.error);
          throw response.error;
        }
        return response.data as Trip;
      }),
      tap(() => this.refreshTrips())
    );
  }

  updateTrip(id: number, trip: TripUpdate): Observable<Trip> {
    const supabase = this.supabaseService.getClient();
    return from(
      supabase.from('Trip').update(trip).eq('id', id).select().single()
    ).pipe(
      map((response) => {
        if (response.error) {
          console.error('[TripsService] Error updating trip:', response.error);
          throw response.error;
        }
        return response.data as Trip;
      }),
      tap(() => this.refreshTrips())
    );
  }

  deleteTrip(id: number): Observable<void> {
    const supabase = this.supabaseService.getClient();
    return from(supabase.from('Trip').delete().eq('id', id)).pipe(
      map((response) => {
        if (response.error) {
          console.error('[TripsService] Error deleting trip:', response.error);
          throw response.error;
        }
      }),
      tap(() => this.refreshTrips())
    );
  }

  // ==================== PLACES ====================

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
    const supabase = this.supabaseService.getClient();
    return from(supabase.from('Place').insert(place).select().single()).pipe(
      map((response) => {
        if (response.error) {
          console.error('[TripsService] Error creating place:', response.error);
          throw response.error;
        }
        return response.data as Place;
      })
    );
  }

  updatePlace(id: number, updates: PlaceUpdate): Observable<Place> {
    const supabase = this.supabaseService.getClient();
    return from(
      supabase.from('Place').update(updates).eq('id', id).select().single()
    ).pipe(
      map((response) => {
        if (response.error) {
          console.error('[TripsService] Error updating place:', response.error);
          throw response.error;
        }
        return response.data as Place;
      })
    );
  }

  // ==================== TRIP PLACES ====================

  getTripPlaces(tripId: number): Observable<TripPlaceWithDetails[]> {
    // Create BehaviorSubject if not exists
    if (!this.tripPlacesMap.has(tripId)) {
      this.tripPlacesMap.set(
        tripId,
        new BehaviorSubject<TripPlaceWithDetails[]>([])
      );
      this.loadTripPlaces(tripId);
    }
    return this.tripPlacesMap.get(tripId)!.asObservable();
  }

  private loadTripPlaces(tripId: number): void {
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
        })
      )
      .subscribe({
        next: (tripPlaces) => {
          const subject = this.tripPlacesMap.get(tripId);
          if (subject) {
            subject.next(tripPlaces);
          }
        },
        error: (error) =>
          console.error('[TripsService] Load TripPlaces error:', error),
      });
  }

  refreshTripPlaces(tripId: number): void {
    this.loadTripPlaces(tripId);
  }

  createTripPlace(tripPlace: TripPlaceInsert): Observable<TripPlace> {
    const supabase = this.supabaseService.getClient();
    const data = {
      ...tripPlace,
      is_alert_active: tripPlace.is_alert_active ?? false,
    };
    return from(supabase.from('TripPlace').insert(data).select().single()).pipe(
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
        // Get full details for notification scheduling
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
        this.refreshTrips(); // Map needs trip update too
      })
    );
  }

  updateTripPlace(id: number, updates: TripPlaceUpdate): Observable<TripPlace> {
    const supabase = this.supabaseService.getClient();
    return from(
      supabase.from('TripPlace').update(updates).eq('id', id).select().single()
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
        // Update notification (will cancel + reschedule if needed)
        const tripPlaceDetails = await this.getTripPlaceWithDetails(
          tripPlace.id
        );
        if (tripPlaceDetails) {
          await this.notificationService.updateNotification(tripPlaceDetails);
        }
        return tripPlace;
      }),
      tap((tripPlace) => {
        this.refreshTripPlaces(tripPlace.trip_id);
        this.refreshTrips(); // Map needs trip update too
      })
    );
  }

  deleteTripPlace(id: number, tripId: number): Observable<void> {
    const supabase = this.supabaseService.getClient();
    return from(supabase.from('TripPlace').delete().eq('id', id)).pipe(
      map((response) => {
        if (response.error) {
          console.error(
            '[TripsService] Error deleting trip place:',
            response.error
          );
          throw response.error;
        }
      }),
      switchMap(async () => {
        // Cancel notification when deleting
        await this.notificationService.cancelNotification(id);
      }),
      tap(() => {
        this.refreshTripPlaces(tripId);
        this.refreshTrips(); // Map needs trip update too
      })
    );
  }

  // Reorder trip places within a trip
  async reorderTripPlaces(
    tripId: number,
    orderedTripPlaceIds: number[]
  ): Promise<void> {
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

    // Refresh after successful reorder
    this.refreshTripPlaces(tripId);
    this.refreshTrips(); // Map needs trip update too
  }

  // Helper: Get trip place with details for notification scheduling
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

  // Get all trip places across all trips (for notification sync)
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
