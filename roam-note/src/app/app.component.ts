import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { NotificationService } from './shared/services/notification.service';
import { TripsService } from './shared/services/trips.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly tripsService: TripsService
  ) {}

  ngOnInit(): void {
    // Request notification permissions on app startup
    this.requestNotificationPermissions();

    // Sync all notifications with database
    this.syncNotifications();
  }

  private async requestNotificationPermissions(): Promise<void> {
    const hasPermission = await this.notificationService.checkPermissions();
    if (!hasPermission) {
      const granted = await this.notificationService.requestPermissions();
      if (granted) {
        console.log('[AppComponent] Notification permissions granted');
      } else {
        console.warn('[AppComponent] Notification permissions denied');
      }
    }
  }

  private async syncNotifications(): Promise<void> {
    try {
      const tripPlaces = await this.tripsService.getAllTripPlaces();
      await this.notificationService.syncAllNotifications(tripPlaces);
      console.log('[AppComponent] Notifications synced on startup');
    } catch (error) {
      console.error('[AppComponent] Error syncing notifications:', error);
    }
  }
}
