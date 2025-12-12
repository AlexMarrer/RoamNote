import {
  Component,
  EnvironmentInjector,
  inject,
  ViewChild,
} from '@angular/core';
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { globeOutline, bookSharp, cogSharp } from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsPage {
  public environmentInjector = inject(EnvironmentInjector);
  @ViewChild(IonTabs) tabs?: IonTabs;

  constructor() {
    addIcons({ globeOutline, bookSharp, cogSharp });
  }

  /**
   * Handles tab changes and manages the native-map-page class
   * Only the Home tab needs a transparent background for Google Maps
   * @param event Tab change event with information about the selected tab
   */
  onTabChange(event: any): void {
    const selectedTab = event?.tab || event?.detail?.tab;
    const isNative = Capacitor.isNativePlatform();

    if (!isNative) return;

    if (selectedTab === 'Home') {
      document.body.classList.add('native-map-page');
    } else {
      document.body.classList.remove('native-map-page');
    }
  }
}
