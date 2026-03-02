// src/app/shared/services/notification.service.ts
import { Injectable, signal } from '@angular/core';

export interface Toast {
  id:      number;
  message: string;
  type:    'success' | 'info' | 'warning' | 'error';
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  toasts = signal<Toast[]>([]);
  private nextId = 1;

  show(message: string, type: Toast['type'] = 'success', duration = 3500) {
    const id = this.nextId++;
    this.toasts.update(list => [...list, { id, message, type }]);
    setTimeout(() => this.dismiss(id), duration);
  }

  dismiss(id: number) {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }
}