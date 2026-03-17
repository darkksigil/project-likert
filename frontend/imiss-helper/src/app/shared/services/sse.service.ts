// src/app/shared/services/sse.service.ts
import { Injectable, inject, OnDestroy } from '@angular/core';
import { AuthService } from './auth.service';

export type SSEEventType =
  | 'connected'
  | 'duty_created'
  | 'duty_updated'
  | 'duty_deleted'
  | 'duty_endorsed'
  | 'duty_unendorsed'
  | 'duty_followed_update';

export interface SSEEvent {
  type:        SSEEventType;
  payload:     any;
  actor?:      string;
  actorRole?:  string;
  endorsedTo?: number;
}

type SSEHandler = (event: SSEEvent) => void;

@Injectable({ providedIn: 'root' })
export class SseService implements OnDestroy {
  private readonly API = 'http://localhost:3000/api';
  private auth         = inject(AuthService);

  private eventSource: EventSource | null = null;
  private handlers    = new Map<SSEEventType, SSEHandler[]>();

  connect() {
    if (this.eventSource) return; // already connected

    const token = this.auth.getToken();
    if (!token) return;

    // Pass token as query param since EventSource doesn't support headers
    this.eventSource = new EventSource(`${this.API}/events?token=${token}`);

    this.eventSource.onmessage = (e) => {
      try {
        const event: SSEEvent = JSON.parse(e.data);
        const typeHandlers = this.handlers.get(event.type) ?? [];
        typeHandlers.forEach(h => h(event));
      } catch { /* malformed event */ }
    };

    this.eventSource.onerror = () => {
      // Auto-reconnect — browser handles this natively for EventSource
      console.warn('[SSE] Connection lost, reconnecting...');
    };
  }

  disconnect() {
    this.eventSource?.close();
    this.eventSource = null;
  }

  on(type: SSEEventType, handler: SSEHandler) {
    const existing = this.handlers.get(type) ?? [];
    this.handlers.set(type, [...existing, handler]);
  }

  off(type: SSEEventType, handler: SSEHandler) {
    const existing = this.handlers.get(type) ?? [];
    this.handlers.set(type, existing.filter(h => h !== handler));
  }

  ngOnDestroy() { this.disconnect(); }
}