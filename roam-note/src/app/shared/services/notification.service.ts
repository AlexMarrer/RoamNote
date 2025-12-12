import { Injectable } from '@angular/core';
import {
  LocalNotifications,
  ScheduleOptions,
  PendingResult,
} from '@capacitor/local-notifications';
import { TripPlaceWithDetails } from '../models/trip-place.model';

interface NotificationSchedule {
  readonly id: number;
  readonly tripPlaceId: number;
  readonly scheduledAt: Date;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  // DEBUG MODE: Set to true for 2-minute testing, false for production (24h)
  private readonly DEBUG_MODE = false;
  private readonly NOTIFICATION_DELAY_HOURS = this.DEBUG_MODE ? 0.033 : 24; // 2min vs 24h
  private readonly NOTIFICATION_HOUR = 9; // 09:00 AM for production notifications

  private readonly notificationSchedules = new Map<
    number,
    NotificationSchedule
  >();

  constructor() {
    // Initialize channel asynchronously
    void this.initializeNotificationChannel();
  }

  /**
   * Initialize notification channel and request permissions
   */
  private async initializeNotificationChannel(): Promise<void> {
    try {
      await LocalNotifications.createChannel({
        id: 'roam_note_trips',
        name: 'Trip Erinnerungen',
        description: 'Benachrichtigungen für bevorstehende Reiseziele',
        importance: 4, // High importance
        visibility: 1, // Public
        sound: 'default',
        vibration: true,
      });
    } catch (error) {
      console.error('[NotificationService] Error creating channel:', error);
    }
  }

  /**
   * Requests notification permissions from the user
   * @returns true if granted, false otherwise
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const permission = await LocalNotifications.requestPermissions();
      return permission.display === 'granted';
    } catch (error) {
      console.error(
        '[NotificationService] Error requesting permissions:',
        error
      );
      return false;
    }
  }

  /**
   * Checks if notifications are enabled
   * @returns true if notifications are allowed
   */
  async checkPermissions(): Promise<boolean> {
    try {
      const permission = await LocalNotifications.checkPermissions();
      return permission.display === 'granted';
    } catch (error) {
      console.error('[NotificationService] Error checking permissions:', error);
      return false;
    }
  }

  /**
   * Schedules a notification for a trip place
   * DEBUG: 10 seconds before arrival, PRODUCTION: 24h before arrival at 09:00 AM
   * @param tripPlace The trip place for which to schedule the notification
   */
  async scheduleNotificationForSpot(
    tripPlace: TripPlaceWithDetails
  ): Promise<void> {
    // Only schedule if alert is active and arrival date exists
    if (!tripPlace.is_alert_active || !tripPlace.arrival_date) {
      return;
    }

    // Check permissions first
    const hasPermission = await this.checkPermissions();
    if (!hasPermission) {
      console.warn('[NotificationService] No notification permission granted');
      return;
    }

    try {
      // Calculate notification time
      const notificationDate = this.calculateNotificationDate(
        tripPlace.arrival_date
      );

      // Don't schedule notifications in the past
      if (notificationDate <= new Date()) {
        console.warn(
          '[NotificationService] Notification time is in the past, skipping:',
          tripPlace.place_name
        );
        return;
      }

      const notification: ScheduleOptions = {
        notifications: [
          {
            id: tripPlace.id,
            title: `Erinnerung: ${tripPlace.place_name}`,
            body: this.DEBUG_MODE
              ? `🧪 TEST: Du kommst bald in ${tripPlace.place_name} an!`
              : `Du kommst morgen in ${tripPlace.place_name} an! Gute Reise 🌍`,
            schedule: { at: notificationDate },
            sound: 'default',
            channelId: 'roam_note_trips',
            smallIcon: 'ic_launcher',
          },
        ],
      };

      await LocalNotifications.schedule(notification);

      // Store schedule info
      this.notificationSchedules.set(tripPlace.id, {
        id: tripPlace.id,
        tripPlaceId: tripPlace.id,
        scheduledAt: notificationDate,
      });

      console.log(
        `[NotificationService] Scheduled notification for ${
          tripPlace.place_name
        } at ${notificationDate.toLocaleString()}`
      );
    } catch (error) {
      console.error(
        '[NotificationService] Error scheduling notification:',
        error
      );
    }
  }

  /**
   * Calculate when notification should be triggered
   * DEBUG: 2 minutes from now
   * PRODUCTION: 1 day before arrival at 09:00 AM
   */
  private calculateNotificationDate(arrivalDateString: string): Date {
    if (this.DEBUG_MODE) {
      const now = new Date();
      const delayMs = this.NOTIFICATION_DELAY_HOURS * 60 * 60 * 1000;
      return new Date(now.getTime() + delayMs);
    } else {
      const notificationDate = new Date(arrivalDateString);
      notificationDate.setDate(notificationDate.getDate() - 1); // 1 day before
      notificationDate.setHours(this.NOTIFICATION_HOUR, 0, 0, 0); // 09:00 AM

      return notificationDate;
    }
  }

  /**
   * Cancels the notification for a trip place
   * @param tripPlaceId The trip place ID
   */
  async cancelNotification(tripPlaceId: number): Promise<void> {
    try {
      await LocalNotifications.cancel({ notifications: [{ id: tripPlaceId }] });
      this.notificationSchedules.delete(tripPlaceId);
      console.log(
        `[NotificationService] Cancelled notification for trip place ${tripPlaceId}`
      );
    } catch (error) {
      console.error(
        '[NotificationService] Error cancelling notification:',
        error
      );
    }
  }

  /**
   * Updates a notification (cancels old, schedules new)
   * @param tripPlace The updated trip place
   */
  async updateNotification(tripPlace: TripPlaceWithDetails): Promise<void> {
    // Cancel existing notification first
    await this.cancelNotification(tripPlace.id);

    // Schedule new one if alert is still active
    if (tripPlace.is_alert_active && tripPlace.arrival_date) {
      await this.scheduleNotificationForSpot(tripPlace);
    }
  }

  /**
   * Synchronizes all notifications with current trip places
   * Called on app startup to clean up old notifications
   * @param tripPlaces Array of all trip places
   */
  async syncAllNotifications(
    tripPlaces: TripPlaceWithDetails[]
  ): Promise<void> {
    try {
      // Get all pending notifications
      const pending: PendingResult = await LocalNotifications.getPending();
      const pendingIds = new Set(pending.notifications.map((n) => n.id));

      // Cancel all old notifications that are no longer in DB or not active
      for (const pendingId of pendingIds) {
        const tripPlace = tripPlaces.find((tp) => tp.id === pendingId);
        if (
          !tripPlace ||
          !tripPlace.is_alert_active ||
          !tripPlace.arrival_date
        ) {
          await this.cancelNotification(pendingId);
        }
      }

      // Schedule notifications for all active trip places
      for (const tripPlace of tripPlaces) {
        if (tripPlace.is_alert_active && tripPlace.arrival_date) {
          // Only schedule if not already pending or if date changed
          const isPending = pendingIds.has(tripPlace.id);
          if (!isPending) {
            await this.scheduleNotificationForSpot(tripPlace);
          }
        }
      }

      console.log('[NotificationService] Synced all notifications');
    } catch (error) {
      console.error(
        '[NotificationService] Error syncing notifications:',
        error
      );
    }
  }

  /**
   * Cancels all notifications (useful for debugging)
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({
          notifications: pending.notifications,
        });
        this.notificationSchedules.clear();
        console.log('[NotificationService] Cancelled all notifications');
      }
    } catch (error) {
      console.error(
        '[NotificationService] Error cancelling all notifications:',
        error
      );
    }
  }

  /**
   * Returns all pending notifications (for debugging)
   * @returns Promise with pending notifications
   */
  async getPendingNotifications(): Promise<PendingResult> {
    return LocalNotifications.getPending();
  }
}
