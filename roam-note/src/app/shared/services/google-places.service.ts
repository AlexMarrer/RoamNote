/// <reference types="google.maps" />

import { Injectable } from '@angular/core';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { environment } from '../../../environments/environment';
import {
  GooglePlacePrediction,
  GooglePlaceResult,
} from '../models/google-place.model';

/**
 * Google Places Service using REST API (Web Service) on Android
 * and JavaScript SDK on Web for CORS compatibility
 */
@Injectable({
  providedIn: 'root',
})
export class GooglePlacesService {
  private readonly apiKey = environment.googleMapsApiKey;
  private readonly autocompleteUrl =
    'https://maps.googleapis.com/maps/api/place/autocomplete/json';
  private readonly detailsUrl =
    'https://maps.googleapis.com/maps/api/place/details/json';

  // For Web platform (CORS workaround)
  private autocompleteService?: google.maps.places.AutocompleteService;
  private placesService?: google.maps.places.PlacesService;
  private readonly isNative = Capacitor.isNativePlatform();

  constructor() {
    if (!this.isNative) {
      this.initializeWebServices();
    }
  }

  /**
   * Initialize Google Maps JavaScript SDK services for Web
   */
  private initializeWebServices(): void {
    if (typeof google !== 'undefined' && google.maps) {
      this.autocompleteService = new google.maps.places.AutocompleteService();
      const dummyElement = document.createElement('div');
      this.placesService = new google.maps.places.PlacesService(
        new google.maps.Map(dummyElement)
      );
    } else {
      console.warn('[GooglePlacesService] Google Maps not loaded yet (Web)');
    }
  }

  /**
   * Searches for places with the Google Places Autocomplete API
   * Web: Uses JavaScript SDK (CORS-safe)
   * Android: Uses REST API via CapacitorHttp
   * @param query The search text
   * @returns Promise with place suggestions
   */
  async searchPlaces(query: string): Promise<GooglePlacePrediction[]> {
    if (this.isNative) {
      return this.searchPlacesNative(query);
    } else {
      return this.searchPlacesWeb(query);
    }
  }

  /**
   * Native implementation using REST API
   */
  private async searchPlacesNative(
    query: string
  ): Promise<GooglePlacePrediction[]> {
    try {
      const params = {
        input: query,
        key: this.apiKey,
        types: 'establishment|geocode',
      };

      const response = await CapacitorHttp.get({
        url: this.autocompleteUrl,
        params,
      });

      if (response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = response.data;

      if (data.status === 'OK' && data.predictions) {
        return data.predictions.map((p: any) => ({
          place_id: p.place_id,
          description: p.description,
          structured_formatting: {
            main_text: p.structured_formatting.main_text,
            secondary_text: p.structured_formatting.secondary_text || '',
          },
        }));
      } else if (data.status === 'ZERO_RESULTS') {
        return [];
      } else {
        console.error('[GooglePlacesService] Search error:', data);
        throw new Error(`Places search failed: ${data.status}`);
      }
    } catch (error) {
      console.error(
        '[GooglePlacesService] Search places error (native):',
        error
      );
      throw error;
    }
  }

  /**
   * Web implementation using JavaScript SDK (CORS-safe)
   */
  private async searchPlacesWeb(
    query: string
  ): Promise<GooglePlacePrediction[]> {
    if (!this.autocompleteService) {
      this.initializeWebServices();
    }

    if (!this.autocompleteService) {
      throw new Error('Google Maps AutocompleteService not available');
    }

    return new Promise((resolve, reject) => {
      this.autocompleteService!.getPlacePredictions(
        {
          input: query,
          types: ['establishment', 'geocode'],
        },
        (
          predictions: google.maps.places.AutocompletePrediction[] | null,
          status: google.maps.places.PlacesServiceStatus
        ) => {
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            predictions
          ) {
            resolve(
              predictions.map(
                (p: google.maps.places.AutocompletePrediction) => ({
                  place_id: p.place_id,
                  description: p.description,
                  structured_formatting: {
                    main_text: p.structured_formatting.main_text,
                    secondary_text:
                      p.structured_formatting.secondary_text || '',
                  },
                })
              )
            );
          } else if (
            status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS
          ) {
            resolve([]);
          } else {
            reject(new Error(`Places search failed: ${status}`));
          }
        }
      );
    });
  }

  /**
   * Loads detailed information for a place including coordinates
   * Web: Uses JavaScript SDK (CORS-safe)
   * Android: Uses REST API via CapacitorHttp
   * @param placeId The Google Place ID
   * @returns Promise with the place details
   */
  async getPlaceDetails(placeId: string): Promise<GooglePlaceResult> {
    if (this.isNative) {
      return this.getPlaceDetailsNative(placeId);
    } else {
      return this.getPlaceDetailsWeb(placeId);
    }
  }

  /**
   * Native implementation using REST API
   */
  private async getPlaceDetailsNative(
    placeId: string
  ): Promise<GooglePlaceResult> {
    try {
      const params = {
        place_id: placeId,
        key: this.apiKey,
        fields: 'place_id,name,formatted_address,geometry',
      };

      const response = await CapacitorHttp.get({
        url: this.detailsUrl,
        params,
      });

      if (response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = response.data;

      if (data.status === 'OK' && data.result) {
        const place = data.result;

        if (!place.geometry?.location) {
          throw new Error('Place has no geometry');
        }

        return {
          place_id: place.place_id,
          name: place.name,
          formatted_address: place.formatted_address,
          geometry: {
            location: {
              lat: place.geometry.location.lat,
              lng: place.geometry.location.lng,
            },
          },
        };
      } else {
        console.error('[GooglePlacesService] Details error:', data);
        throw new Error(`Place details fetch failed: ${data.status}`);
      }
    } catch (error) {
      console.error(
        '[GooglePlacesService] Get place details error (native):',
        error
      );
      throw error;
    }
  }

  /**
   * Web implementation using JavaScript SDK (CORS-safe)
   */
  private async getPlaceDetailsWeb(
    placeId: string
  ): Promise<GooglePlaceResult> {
    if (!this.placesService) {
      this.initializeWebServices();
    }

    if (!this.placesService) {
      throw new Error('Google Maps PlacesService not available');
    }

    return new Promise((resolve, reject) => {
      this.placesService!.getDetails(
        {
          placeId,
          fields: ['place_id', 'name', 'formatted_address', 'geometry'],
        },
        (
          place: google.maps.places.PlaceResult | null,
          status: google.maps.places.PlacesServiceStatus
        ) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            if (!place.geometry?.location) {
              reject(new Error('Place has no geometry'));
              return;
            }

            resolve({
              place_id: place.place_id!,
              name: place.name!,
              formatted_address: place.formatted_address!,
              geometry: {
                location: {
                  lat: place.geometry.location.lat(),
                  lng: place.geometry.location.lng(),
                },
              },
            });
          } else {
            reject(new Error(`Place details fetch failed: ${status}`));
          }
        }
      );
    });
  }
}
