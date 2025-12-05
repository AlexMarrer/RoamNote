import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
} from '@ionic/angular/standalone';
import { BatteryInfo, Device, DeviceInfo } from '@capacitor/device';
import { Geolocation, Position } from '@capacitor/geolocation';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
})
export class Tab2Page implements OnInit, OnDestroy {
  deviceInfo: DeviceInfo | null = null;
  batteryInfo: BatteryInfo | null = null;
  currentPosition: Position | null = null;
  hasSucceeded = false;
  error = '';
  debug = ''; // Für Debugging

  private watchId: string | null = null;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private ngZone: NgZone) {}

  ngOnInit(): void {
    this.initializeData();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private async initializeData(): Promise<void> {
    await this.loadDeviceInfo();
    await this.initGeolocation();
    this.startRefreshInterval();
  }

  private async loadDeviceInfo(): Promise<void> {
    this.deviceInfo = await Device.getInfo();
    this.batteryInfo = await Device.getBatteryInfo();
  }

  private async initGeolocation(): Promise<void> {
    try {
      let permission = await Geolocation.checkPermissions();
      this.debug = `Permission: ${permission.location}`;

      if (
        permission.location === 'prompt' ||
        permission.location === 'prompt-with-rationale'
      ) {
        permission = await Geolocation.requestPermissions();
      }

      if (permission.location !== 'granted') {
        this.error = 'Standort-Berechtigung verweigert';
        return;
      }

      this.hasSucceeded = true;
      this.debug += ' | Versuche getCurrentPosition...';

      // getCurrentPosition mit höherem Timeout
      try {
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: false, // Auf false setzen für Emulator
          timeout: 30000, // 30 Sekunden Timeout
          maximumAge: 60000, // Akzeptiere gecachte Position bis 1 Minute alt
        });
        this.currentPosition = position;
        this.debug += ` | Position erhalten: ${position.coords.latitude}`;
      } catch (posErr) {
        this.debug += ` | getCurrentPosition Fehler: ${
          (posErr as Error).message
        }`;
        // Trotzdem watchPosition starten
      }

      // watchPosition starten
      this.watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: false,
          timeout: 30000,
          maximumAge: 60000,
        },
        (position, err) => {
          this.ngZone.run(() => {
            if (err) {
              this.error = err.message;
              this.debug += ` | Watch Fehler: ${err.message}`;
              return;
            }
            if (position) {
              this.currentPosition = position;
              this.debug = `Watch OK: ${position.coords.latitude}, ${position.coords.longitude}`;
            }
          });
        }
      );
    } catch (e) {
      this.error = (e as Error).message;
      this.debug += ` | Fehler: ${this.error}`;
    }
  }

  private startRefreshInterval(): void {
    this.refreshInterval = setInterval(() => {
      this.loadDeviceInfo();
    }, 5000);
  }

  private async cleanup(): Promise<void> {
    if (this.watchId) {
      await Geolocation.clearWatch({ id: this.watchId });
    }
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}
