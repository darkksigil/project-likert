// src/app/shared/services/browser-notification.service.ts
import { Injectable, inject } from '@angular/core';
import { NotifFilterService } from './notif-filter.service';

@Injectable({ providedIn: 'root' })
export class BrowserNotificationService {
  private readonly STORAGE_KEY = 'browser_notif_enabled';
  private filter = inject(NotifFilterService);

  get isSupported(): boolean { return 'Notification' in window; }

  get isEnabled(): boolean {
    return localStorage.getItem(this.STORAGE_KEY) === 'true'
      && Notification.permission === 'granted';
  }

  get permission(): NotificationPermission {
    return this.isSupported ? Notification.permission : 'denied';
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported) return false;
    const result = await Notification.requestPermission();
    localStorage.setItem(this.STORAGE_KEY, result === 'granted' ? 'true' : 'false');
    return result === 'granted';
  }

  disable() { localStorage.setItem(this.STORAGE_KEY, 'false'); }

  // concernType is optional — if provided, checks filter
  notify(title: string, body: string, tag?: string, concernType?: string, bypassFilter = false) {
    if (!this.isEnabled) return;
    if (!bypassFilter && concernType && !this.filter.shouldNotify(concernType)) return;
    try {
      new Notification(title, {
        body,
        icon:   '/favicon.ico',
        tag:    tag ?? title,
        silent: false,
      });
    } catch {}
  }
}