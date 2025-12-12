import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import {
  IonToggle,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonItem,
  IonList,
  IonIcon,
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../shared/services/theme.service';
import { addIcons } from 'ionicons';
import { moon } from 'ionicons/icons';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  imports: [
    CommonModule,
    IonToggle,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonItem,
    IonList,
    IonIcon,
    FormsModule,
  ],
})
export class HeaderComponent implements OnInit {
  @Input() title?: string;
  paletteToggle = false;

  constructor(private readonly themeService: ThemeService) {
    addIcons({ moon });
  }

  /**
   * Initializes the header component
   * Subscribes to dark mode changes and sets the initial state
   */
  ngOnInit() {
    this.themeService.darkMode$.subscribe((isDark) => {
      this.paletteToggle = isDark;
    });

    this.paletteToggle = this.themeService.isDarkMode();
  }

  /**
   * Returns the current dark mode status
   * @returns true if dark mode is active, false otherwise
   */
  getPaletteToggle() {
    return this.paletteToggle;
  }

  /**
   * Handles dark mode toggle changes (Desktop)
   * @param event CustomEvent with the new toggle status
   */
  toggleChange(event: CustomEvent) {
    this.themeService.toggleDarkMode(event.detail.checked);
  }

  /**
   * Toggles dark mode (Mobile)
   */
  toggleMobile() {
    this.themeService.toggleDarkMode(!this.paletteToggle);
  }
}
