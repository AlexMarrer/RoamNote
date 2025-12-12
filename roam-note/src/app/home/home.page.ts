import { Component, OnInit, ViewChild } from '@angular/core';
import {
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  ModalController,
  ViewWillEnter,
  ViewWillLeave,
} from '@ionic/angular/standalone';
import { HeaderComponent, MapTripsComponent } from '../shared';
import { Capacitor } from '@capacitor/core';
import { TripManagementModalComponent } from '../components/trip-management-modal/trip-management-modal.component';
import { pencilOutline } from 'ionicons/icons';
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
export class HomePage implements OnInit, ViewWillEnter, ViewWillLeave {
  @ViewChild(MapTripsComponent) mapComponent?: MapTripsComponent;

  constructor(private readonly modalController: ModalController) {
    addIcons({ pencilOutline });
  }

  /**
   * Initializes the home page
   * Adds the native-map-page class on native platforms
   */
  ngOnInit() {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      document.body.classList.add('native-map-page');
    }
  }

  /**
   * Called when the view is entered
   * Initializes the map component
   */
  ionViewWillEnter(): void {
    // setTimeout ensures ViewChild is initialized before accessing it
    setTimeout(() => {
      this.mapComponent?.ionViewWillEnter();
    }, 0);
  }

  /**
   * Called when the view is left
   * Releases map resources
   */
  ionViewWillLeave(): void {
    this.mapComponent?.ionViewWillLeave();
  }

  /**
   * Opens the trip management modal
   * Allows managing trips and places
   */
  async openTripManagement(): Promise<void> {
    const modal = await this.modalController.create({
      component: TripManagementModalComponent,
    });

    await modal.present();
  }
}
