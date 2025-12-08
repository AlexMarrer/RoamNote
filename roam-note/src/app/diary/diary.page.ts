import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { BatteryInfo, Device, DeviceInfo } from '@capacitor/device';
import { Position } from '@capacitor/geolocation';
import { HeaderComponent } from '../shared';
import { SpotsService } from '../shared/services/spots.service';

@Component({
  selector: 'app-diary',
  templateUrl: 'diary.page.html',
  styleUrls: ['diary.page.scss'],
  imports: [IonContent, HeaderComponent],
})
export class DiaryPage implements OnInit, OnDestroy {
  deviceInfo: DeviceInfo | null = null;
  batteryInfo: BatteryInfo | null = null;
  currentPosition: Position | null = null;
  hasSucceeded = false;
  error = '';
  debug = '';

  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly spotsService: SpotsService) {}

  ngOnInit(): void {
    this.initializeData();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private async initializeData(): Promise<void> {
    await this.loadDeviceInfo();
    this.spotsService.initGeolocation();
    this.spotsService.userPosition$.subscribe((position) => {
      if (position) {
        this.currentPosition = position;
        this.hasSucceeded = true;
        this.debug = `Position: ${position.coords.latitude}, ${position.coords.longitude}`;
      }
    });
    this.startRefreshInterval();
  }

  private async loadDeviceInfo(): Promise<void> {
    this.deviceInfo = await Device.getInfo();
    this.batteryInfo = await Device.getBatteryInfo();
  }

  private startRefreshInterval(): void {
    this.refreshInterval = setInterval(() => {
      this.loadDeviceInfo();
    }, 5000);
  }

  private async cleanup(): Promise<void> {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}
