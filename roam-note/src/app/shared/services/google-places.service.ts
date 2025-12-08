/// <reference types="google.maps" />

import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  GooglePlacePrediction,
  GooglePlaceResult,
} from '../models/google-place.model';

@Injectable({
  providedIn: 'root',
})
export class GooglePlacesService {
  private readonly apiKey = environment.googleMapsApiKey;
  private autocompleteService?: google.maps.places.AutocompleteService;
  private placesService?: google.maps.places.PlacesService;

  constructor() {
    this.initializeServices();
  }

  private initializeServices(): void {
    if (typeof google !== 'undefined' && google.maps) {
      this.autocompleteService = new google.maps.places.AutocompleteService();
      // PlacesService requires a map element, we'll create a dummy one
      const dummyElement = document.createElement('div');
      this.placesService = new google.maps.places.PlacesService(
        new google.maps.Map(dummyElement)
      );
    } else {
      console.warn('[GooglePlacesService] Google Maps not loaded yet');
    }
  }

  async searchPlaces(query: string): Promise<GooglePlacePrediction[]> {
    if (!this.autocompleteService) {
      this.initializeServices();
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

  async getPlaceDetails(placeId: string): Promise<GooglePlaceResult> {
    if (!this.placesService) {
      this.initializeServices();
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
