import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { Trip } from '../models/trip.model';
import { TripPlaceWithDetails } from '../models/trip-place.model';

@Injectable({
  providedIn: 'root',
})
export class TripsStorageService {
  private readonly TRIPS_KEY = 'cached_trips';
  private readonly PLACES_KEY = 'cached_places';
  private readonly TRIP_PLACES_KEY = 'cached_trip_places';

  /**
   * Stores trips in local cache
   * @param trips Array of trips to cache
   */
  async cacheTrips(trips: Trip[]): Promise<void> {
    try {
      await Preferences.set({
        key: this.TRIPS_KEY,
        value: JSON.stringify(trips),
      });
    } catch (error) {
      console.error('[TripsStorageService] Error caching trips:', error);
    }
  }

  /**
   * Loads cached trips from local storage
   * @returns Promise with the cached trips
   */
  async getCachedTrips(): Promise<Trip[]> {
    try {
      const { value } = await Preferences.get({ key: this.TRIPS_KEY });
      if (!value) {
        return [];
      }
      const trips = JSON.parse(value) as Trip[];

      return trips;
    } catch (error) {
      console.error('[TripsStorageService] Error loading cached trips:', error);
      return [];
    }
  }

  /**
   * Stores trip places in local cache
   * @param tripId The trip ID
   * @param tripPlaces Array of trip places to cache
   */
  async cacheTripPlaces(
    tripId: number,
    tripPlaces: TripPlaceWithDetails[]
  ): Promise<void> {
    try {
      const key = `${this.TRIP_PLACES_KEY}_${tripId}`;
      await Preferences.set({
        key,
        value: JSON.stringify(tripPlaces),
      });
    } catch (error) {
      console.error('[TripsStorageService] Error caching trip places:', error);
    }
  }

  /**
   * Loads cached trip places from local storage
   * @param tripId The trip ID
   * @returns Promise with the cached trip places
   */
  async getCachedTripPlaces(tripId: number): Promise<TripPlaceWithDetails[]> {
    try {
      const key = `${this.TRIP_PLACES_KEY}_${tripId}`;
      const { value } = await Preferences.get({ key });
      if (!value) {
        return [];
      }
      const tripPlaces = JSON.parse(value) as TripPlaceWithDetails[];

      return tripPlaces;
    } catch (error) {
      console.error(
        '[TripsStorageService] Error loading cached trip places:',
        error
      );
      return [];
    }
  }

  /**
   * Deletes all cached trips and places
   */
  async clearCache(): Promise<void> {
    try {
      await Preferences.remove({ key: this.TRIPS_KEY });
      await Preferences.remove({ key: this.PLACES_KEY });
    } catch (error) {
      console.error('[TripsStorageService] Error clearing cache:', error);
    }
  }
}
