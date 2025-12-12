import { Injectable } from '@angular/core';
import { Network } from '@capacitor/network';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NetworkService {
  private readonly onlineSubject$ = new BehaviorSubject<boolean>(true);
  public readonly online$ = this.onlineSubject$.asObservable();
  private initialized = false;

  /**
   * Initializes the network service
   * Registers a listener for network status changes
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    await this.initializeNetworkListener();
  }

  private async initializeNetworkListener(): Promise<void> {
    const status = await Network.getStatus();
    this.onlineSubject$.next(status.connected);

    Network.addListener('networkStatusChange', (status) => {
      this.onlineSubject$.next(status.connected);
    });
  }

  /**
   * Returns the current online status
   * @returns true if the device is online
   */
  isOnline(): boolean {
    return this.onlineSubject$.value;
  }

  /**
   * Returns an observable of the online status
   * @returns Observable that emits on network status changes
   */
  getOnlineStatus(): Observable<boolean> {
    return this.online$;
  }
}
