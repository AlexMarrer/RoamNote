import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  ModalController,
} from '@ionic/angular/standalone';
import { HeaderComponent, MapTripsComponent } from '../shared';
import { Capacitor } from '@capacitor/core';
import { TripManagementModalComponent } from '../components/trip-management-modal/trip-management-modal.component';
import { addOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';

@Component({
  selector: 'app-Home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    IonContent,
    IonFab,
    IonFabButton,
    IonIcon,
    HeaderComponent,
    MapTripsComponent,
  ],
})
export class HomePage implements OnInit, OnDestroy {
  constructor(private readonly modalController: ModalController) {
    addIcons({ addOutline });
  }

  ngOnInit() {
    // Only add transparent map page styles on native platforms
    if (Capacitor.isNativePlatform()) {
      document.body.classList.add('native-map-page');
    }
  }

  ngOnDestroy() {
    // Cleanup beim Verlassen der Page
    document.body.classList.remove('native-map-page');
  }

  async openTripManagement(): Promise<void> {
    const modal = await this.modalController.create({
      component: TripManagementModalComponent,
      cssClass: 'trip-management-modal',
      backdropDismiss: true,
    });

    await modal.present();
  }
}
