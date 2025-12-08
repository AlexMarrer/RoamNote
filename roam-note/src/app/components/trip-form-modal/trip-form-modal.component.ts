import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
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
} from '@ionic/angular/standalone';
import { Trip } from '../../shared/models/trip.model';

@Component({
  selector: 'app-trip-form-modal',
  templateUrl: './trip-form-modal.component.html',
  styleUrls: ['./trip-form-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
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
  ],
})
export class TripFormModalComponent implements OnInit {
  @Input() trip?: Trip;

  tripForm!: FormGroup;
  isEditMode = false;
  saving = false;

  constructor(
    private readonly modalController: ModalController,
    private readonly formBuilder: FormBuilder
  ) {}

  ngOnInit(): void {
    this.isEditMode = !!this.trip;
    this.initializeForm();
  }

  private initializeForm(): void {
    this.tripForm = this.formBuilder.group({
      name: [
        this.trip?.name || '',
        [Validators.required, Validators.maxLength(100)],
      ],
      note: [this.trip?.note || '', [Validators.maxLength(500)]],
      start_date: [this.trip?.start_date || null],
      end_date: [this.trip?.end_date || null],
    });
  }

  dismiss(): void {
    this.modalController.dismiss();
  }

  save(): void {
    if (!this.tripForm.valid) {
      return;
    }

    this.saving = true;
    const formValue = this.tripForm.value;

    // Convert ISO datetime strings to date-only format (YYYY-MM-DD)
    const tripData = {
      name: formValue.name,
      note: formValue.note || undefined,
      start_date: formValue.start_date
        ? new Date(formValue.start_date).toISOString().split('T')[0]
        : undefined,
      end_date: formValue.end_date
        ? new Date(formValue.end_date).toISOString().split('T')[0]
        : undefined,
    };

    this.modalController.dismiss({
      trip: tripData,
      isEdit: this.isEditMode,
      tripId: this.trip?.id,
    });
  }
}
