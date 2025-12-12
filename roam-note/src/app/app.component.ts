import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { NotificationService } from './shared/services/notification.service';
import { TripsService } from './shared/services/trips.service';
import { ThemeService } from './shared/services/theme.service';
import { SpotsService } from './shared/services/spots.service';
import { NetworkService } from './shared/services/network.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly tripsService: TripsService,
    private readonly themeService: ThemeService,
    private readonly spotsService: SpotsService,
    private readonly networkService: NetworkService
  ) {}

  /**
   * Initializes the app component
   * Starts app initialization when component loads
   */
  ngOnInit(): void {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.networkService.initialize();
    await this.themeService.initialize();
    await this.requestNotificationPermissions();
    await this.requestLocationPermissions();
    await this.syncNotifications();
  }

  private async requestNotificationPermissions(): Promise<void> {
    const hasPermission = await this.notificationService.checkPermissions();
    if (!hasPermission) {
      await this.notificationService.requestPermissions();
    }
  }

  private async requestLocationPermissions(): Promise<void> {
    await this.spotsService.requestLocationPermission();
  }

  private async syncNotifications(): Promise<void> {
    try {
      const tripPlaces = await this.tripsService.getAllTripPlaces();
      await this.notificationService.syncAllNotifications(tripPlaces);
    } catch (error) {
      console.error('[AppComponent] Error syncing notifications:', error);
    }
  }
}
