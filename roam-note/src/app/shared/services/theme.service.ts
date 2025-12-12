import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly darkModeSubject = new BehaviorSubject<boolean>(
    this.getInitialDarkMode()
  );
  public readonly darkMode$: Observable<boolean> =
    this.darkModeSubject.asObservable();

  constructor() {
    this.initializeDarkMode();
  }

  /**
   * Initializes the theme service
   * Shows the status bar on native platforms
   */
  async initialize(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await StatusBar.show();
      } catch (error) {
        console.warn('[ThemeService] Could not show status bar:', error);
      }
    }
  }

  private getInitialDarkMode(): boolean {
    // Try to get from localStorage first
    const stored = localStorage.getItem('roam-note-dark-mode');
    if (stored !== null) {
      return stored === 'true';
    }

    // Fall back to system preference
    return globalThis.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private initializeDarkMode(): void {
    const isDark = this.darkModeSubject.value;
    this.applyDarkMode(isDark);

    // Listen for system preference changes
    const prefersDark = globalThis.matchMedia('(prefers-color-scheme: dark)');
    prefersDark.addEventListener('change', (mediaQuery) => {
      // Only apply if user hasn't manually set a preference
      if (localStorage.getItem('roam-note-dark-mode') === null) {
        this.applyDarkMode(mediaQuery.matches);
        this.darkModeSubject.next(mediaQuery.matches);
      }
    });
  }

  /**
   * Toggles dark mode on or off
   * @param isDark true for dark mode, false for light mode
   */
  toggleDarkMode(isDark: boolean): void {
    localStorage.setItem('roam-note-dark-mode', isDark.toString());
    this.applyDarkMode(isDark);
    this.darkModeSubject.next(isDark);
  }

  private applyDarkMode(isDark: boolean): void {
    document.documentElement.classList.toggle('ion-palette-dark', isDark);
    this.setStatusBarStyle(isDark);
  }

  private async setStatusBarStyle(isDark: boolean): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      await StatusBar.setStyle({
        style: isDark ? Style.Dark : Style.Light,
      });
    } catch (error) {
      console.warn('[ThemeService] Could not set status bar style:', error);
    }
  }

  /**
   * Returns the current dark mode status
   * @returns true if dark mode is active
   */
  isDarkMode(): boolean {
    return this.darkModeSubject.value;
  }
}
