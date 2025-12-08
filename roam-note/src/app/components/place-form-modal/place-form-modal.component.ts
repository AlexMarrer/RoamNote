import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  ModalController,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonItem,
  IonInput,
  IonTextarea,
  IonDatetime,
  IonDatetimeButton,
  IonModal,
  IonLabel,
  IonToggle,
} from '@ionic/angular/standalone';
import { GooglePlacesService } from '../../shared/services/google-places.service';
import { GooglePlacePrediction } from '../../shared/models/google-place.model';
import { TripPlaceWithDetails } from '../../shared/models/trip-place.model';

interface SelectedPlace {
  readonly name: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly placeId: string;
}

@Component({
  selector: 'app-place-form-modal',
  templateUrl: './place-form-modal.component.html',
  styleUrls: ['./place-form-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonInput,
    IonTextarea,
    IonDatetime,
    IonDatetimeButton,
    IonModal,
    IonLabel,
    IonToggle,
  ],
})
export class PlaceFormModalComponent implements OnInit {
  @Input() tripId!: number;
  @Input() tripPlace?: TripPlaceWithDetails;
  @Input() nextVisitOrder!: number;

  placeForm!: FormGroup;
  isEditMode = false;
  saving = false;

  searchQuery = '';
  searchResults: GooglePlacePrediction[] = [];
  selectedPlace: SelectedPlace | null = null;

  constructor(
    private readonly modalController: ModalController,
    private readonly formBuilder: FormBuilder,
    private readonly googlePlacesService: GooglePlacesService
  ) {}

  ngOnInit(): void {
    this.isEditMode = !!this.tripPlace;
    this.initializeForm();

    if (this.isEditMode && this.tripPlace) {
      this.selectedPlace = {
        name: this.tripPlace.place_name,
        latitude: this.tripPlace.place_latitude,
        longitude: this.tripPlace.place_longitude,
        placeId: '', // Not available for existing places
      };
    }
  }

  private initializeForm(): void {
    this.placeForm = this.formBuilder.group({
      arrival_date: [this.tripPlace?.arrival_date || null],
      departure_date: [this.tripPlace?.departure_date || null],
      is_alert_active: [this.tripPlace?.is_alert_active || false],
      note: [this.tripPlace?.note || ''],
    });
  }

  dismiss(): void {
    this.modalController.dismiss();
  }

  async onSearchInput(event: CustomEvent): Promise<void> {
    const query = (event.detail.value || '').trim();

    if (!query || query.length < 3) {
      this.searchResults = [];
      return;
    }

    try {
      this.searchResults = await this.googlePlacesService.searchPlaces(query);
    } catch (error) {
      console.error('[PlaceFormModal] Error searching places:', error);
      this.searchResults = [];
    }
  }

  async selectPlace(prediction: GooglePlacePrediction): Promise<void> {
    try {
      const placeDetails = await this.googlePlacesService.getPlaceDetails(
        prediction.place_id
      );

      this.selectedPlace = {
        name: placeDetails.name,
        latitude: placeDetails.geometry.location.lat,
        longitude: placeDetails.geometry.location.lng,
        placeId: placeDetails.place_id,
      };

      this.searchQuery = placeDetails.name;
      this.searchResults = [];
    } catch (error) {
      console.error('[PlaceFormModal] Error fetching place details:', error);
    }
  }

  canSave(): boolean {
    return this.selectedPlace !== null && this.placeForm.valid;
  }

  save(): void {
    if (!this.canSave() || !this.selectedPlace) {
      return;
    }

    this.saving = true;
    const formValue = this.placeForm.value;

    const placeData = {
      place: {
        name: this.selectedPlace.name,
        latitude: this.selectedPlace.latitude,
        longitude: this.selectedPlace.longitude,
      },
      tripPlace: {
        trip_id: this.tripId,
        visit_order: this.isEditMode
          ? this.tripPlace!.visit_order
          : this.nextVisitOrder,
        arrival_date: formValue.arrival_date
          ? new Date(formValue.arrival_date).toISOString().split('T')[0]
          : undefined,
        departure_date: formValue.departure_date
          ? new Date(formValue.departure_date).toISOString().split('T')[0]
          : undefined,
        is_alert_active: formValue.is_alert_active || false,
        note: formValue.note || undefined,
      },
      isEdit: this.isEditMode,
      tripPlaceId: this.tripPlace?.id,
      placeId: this.tripPlace?.place_id,
    };

    this.modalController.dismiss(placeData);
  }
}
