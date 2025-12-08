import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import {
  IonToggle,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonItem,
  IonList,
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../shared/services/theme.service';

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
    FormsModule,
  ],
})
export class HeaderComponent implements OnInit {
  @Input() title?: string;
  paletteToggle = false;

  constructor(private readonly themeService: ThemeService) {}

  ngOnInit() {
    this.themeService.darkMode$.subscribe((isDark) => {
      this.paletteToggle = isDark;
    });

    this.paletteToggle = this.themeService.isDarkMode();
  }

  getPaletteToggle() {
    return this.paletteToggle;
  }

  toggleChange(event: CustomEvent) {
    this.themeService.toggleDarkMode(event.detail.checked);
  }
}
