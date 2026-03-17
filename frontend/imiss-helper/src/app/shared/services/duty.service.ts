// src/app/shared/services/duty.service.ts
import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { Duty, CreateDutyPayload, UpdateDutyPayload, DutyStatus, ConcernType, ActivityLog } from '../models/index';
import { NotificationService } from './notification.service';
import { SseService } from './sse.service';
import { AuthService } from './auth.service';
import { BrowserNotificationService } from './browser-notification.service';


export interface SnackbarItem {
  id:         number;
  duty:       Duty;
  message:    string;
  timeoutId:  any;
  remaining:  number;
  isEndorse?: boolean;
}

const STATUS_LABELS: Record<DutyStatus, string> = {
  pending:     'Pending',
  in_progress: 'In Progress',
  done:        'Done',
  endorsed:    'Endorsed',
  failed:      'Failed',
};

@Injectable({ providedIn: 'root' })
export class DutyService implements OnDestroy {
  private readonly API = 'http://localhost:3000/api';
  private notif  = inject(NotificationService);
  private sse    = inject(SseService);
  private auth   = inject(AuthService);
  private bnotif = inject(BrowserNotificationService);

  duties           = signal<Duty[]>([]);
  endorsedToMe     = signal<Duty[]>([]);
  endorsementCount = computed(() => this.endorsedToMe().length);
  loading          = signal(true);
  snackbars        = signal<SnackbarItem[]>([]);

  pending    = computed(() => this.duties().filter(d => d.status === 'pending'));
  inProgress = computed(() => this.duties().filter(d => d.status === 'in_progress'));
  done       = computed(() => this.duties().filter(d => d.status === 'done'));

  constructor(private http: HttpClient) {
    this.initSSE();
  }

  private initSSE() {
    this.sse.connect();
    const currentUserId = () => this.auth.currentUser()?.id;

    // ── New duty created ──
    this.sse.on('duty_created', ({ payload, actor }) => {
      const exists = this.duties().find(d => d.id === payload.id);
      if (!exists) this.duties.update(list => [payload, ...list]);

      this.notif.show(`New request #${String(payload.id).padStart(4, '0')} by ${actor}`, 'info');
      this.bnotif.notify(
        '🔔 New Request',
        `#${String(payload.id).padStart(4, '0')} — ${payload.data?.concern ?? ''} by ${actor}`,
        `duty-created-${payload.id}`,
        payload.concern_type
      );
    });

    // ── Duty updated ──
    this.sse.on('duty_updated', ({ payload, actor }) => {
      this.duties.update(list => list.map(d => d.id === payload.id ? payload : d));
      if (payload.status !== 'endorsed') {
        this.endorsedToMe.update(list => list.filter(d => d.id !== payload.id));
      }
      const label = STATUS_LABELS[payload.status as DutyStatus] ?? payload.status;
      this.notif.show(`#${String(payload.id).padStart(4, '0')} → ${label} by ${actor}`, 'info');
      this.bnotif.notify(
        '📋 Request Updated',
        `#${String(payload.id).padStart(4, '0')} moved to ${label} by ${actor}`,
        `duty-updated-${payload.id}-${Date.now()}`,
        payload.concern_type
      );
    });

    // ── Duty endorsed ──
    this.sse.on('duty_endorsed', ({ payload, actor, endorsedTo }) => {
      this.duties.update(list => list.map(d => d.id === payload.id ? payload : d));

      if (endorsedTo === currentUserId()) {
        this.endorsedToMe.update(list => {
          const exists = list.find(d => d.id === payload.id);
          return exists ? list : [payload, ...list];
        });
        this.notif.show(`↪ Request #${String(payload.id).padStart(4, '0')} endorsed to you by ${actor}`, 'info');
        // Only browser-notify the recipient
        this.bnotif.notify(
          '↪ Task Assigned to You',
          `#${String(payload.id).padStart(4, '0')} — ${payload.data?.concern ?? ''} from ${actor}`,
          `duty-endorsed-${payload.id}-${Date.now()}`,payload.concern_type
        );
      } else {
        this.notif.show(`#${String(payload.id).padStart(4, '0')} endorsed by ${actor}`, 'info');
      }
    });

    // ── Duty unendorsed ──
    this.sse.on('duty_unendorsed', ({ payload, actor }) => {
      this.duties.update(list => list.map(d => d.id === payload.id ? payload : d));
      this.endorsedToMe.update(list => list.filter(d => d.id !== payload.id));
      this.notif.show(`#${String(payload.id).padStart(4, '0')} unendorsed by ${actor}`, 'info');
    });

    // ── Duty deleted ──
    this.sse.on('duty_deleted', ({ payload }) => {
      this.duties.update(list => list.filter(d => d.id !== payload.id));
      this.endorsedToMe.update(list => list.filter(d => d.id !== payload.id));
    });

    this.sse.on('duty_followed_update', ({ payload, actor }) => {
      this.duties.update(list => list.map(d => d.id === payload.id ? payload : d));
      const label = STATUS_LABELS[payload.status as DutyStatus] ?? payload.status;
    
      // duty_followed_update — bypass filter since user explicitly followed
      this.bnotif.notify(
        '👀 Followed Request Updated',
        `#${String(payload.id).padStart(4, '0')} → ${label} by ${actor}`,
        `duty-follow-${payload.id}-${Date.now()}`,
        payload.concern_type,
        true  // ← bypass concern type filter
      );
    });
  }

  ngOnDestroy() { this.sse.disconnect(); }

  fetchAll() {
    const isFirstLoad = this.duties().length === 0;
    if (isFirstLoad) this.loading.set(true);

    return this.http.get<Duty[]>(`${this.API}/duty-requests`).pipe(
      tap({
        next: incoming => {
          this.loading.set(false);
          if (isFirstLoad) { this.duties.set(incoming); return; }

          let changed = this.duties().length !== incoming.length;
          const currentMap = new Map(this.duties().map(d => [d.id, d]));
          const merged = incoming.map(d => {
            const existing = currentMap.get(d.id);
            if (!existing) { changed = true; return d; }
            const same = JSON.stringify(existing) === JSON.stringify(d);
            if (!same) changed = true;
            return same ? existing : d;
          });

          if (changed) this.duties.set(merged);
        },
        error: () => this.loading.set(false)
      })
    );
  }

  create(payload: CreateDutyPayload) {
    return this.http.post<Duty>(`${this.API}/duty-requests`, payload).pipe(
      tap(d => {
        this.notif.show(`Request #${String(d.id).padStart(4, '0')} submitted`, 'success');
      })
    );
  }

  update(id: number, payload: UpdateDutyPayload) {
    return this.http.patch<Duty>(`${this.API}/duty-requests/${id}/details`, payload).pipe(
      tap(updated => {
        this.duties.update(list => list.map(d => d.id === id ? updated : d));
        this.notif.show(`Request #${String(id).padStart(4, '0')} updated`, 'info');
      })
    );
  }

  updateStatus(id: number, status: DutyStatus, joNumber?: string, joVerified?: boolean) {
    return this.http.patch<Duty>(`${this.API}/duty-requests/${id}`, { status, joNumber, joVerified }).pipe(
      tap(updated => {
        this.duties.update(list => list.map(d => d.id === id ? updated : d));
        this.endorsedToMe.update(list => list.filter(d => d.id !== id));
        const label = STATUS_LABELS[status] ?? status;
        this.notif.show(`Request #${String(id).padStart(4, '0')} → ${label}`, 'success');
      })
    );
  }

  updateConcernType(id: number, concernType: ConcernType) {
    return this.http.patch<Duty>(`${this.API}/duty-requests/${id}/concern-type`, { concernType }).pipe(
      tap(updated => this.duties.update(list => list.map(d => d.id === id ? updated : d)))
    );
  }

  endorse(id: number, endorsedToId: number) {
    return this.http.post<Duty>(`${this.API}/duty-requests/${id}/endorse`, { endorsedToId }).pipe(
      tap(updated => {
        this.duties.update(list => list.map(d => d.id === id ? updated : d));
        this.notif.show(`Request #${String(id).padStart(4, '0')} endorsed`, 'info');
      })
    );
  }

  fetchEndorsedToMe() {
    return this.http.get<Duty[]>(`${this.API}/duty-requests/endorsed-to-me`).pipe(
      tap(incoming => this.endorsedToMe.set(incoming))
    );
  }

  unendorse(id: number) {
    const duty = this.endorsedToMe().find(d => d.id === id);
    if (!duty) return;

    this.endorsedToMe.update(list => list.filter(d => d.id !== id));

    const snackId   = id;
    const timeoutId = setTimeout(() => {
      this.http.delete<Duty>(`${this.API}/duty-requests/${id}/endorse`).pipe(
        tap(updated => this.duties.update(list => list.map(d => d.id === id ? updated : d)))
      ).subscribe();
      this.snackbars.update(list => list.filter(s => s.id !== snackId));
    }, 10000);

    this.snackbars.update(list => [...list, {
      id: snackId, duty,
      message: `Endorsement #${String(id).padStart(4, '0')} removed`,
      timeoutId, remaining: 10,
      isEndorse: true,
    }]);
  }

  undoUnendorse(snackId: number) {
    const snack = this.snackbars().find(s => s.id === snackId);
    if (!snack) return;
    clearTimeout(snack.timeoutId);
    this.endorsedToMe.update(list => [snack.duty, ...list]);
    this.snackbars.update(list => list.filter(s => s.id !== snackId));
    this.notif.show('Endorsement restored', 'info');
  }

  deleteWithUndo(duty: Duty) {
    this.duties.update(list => list.filter(d => d.id !== duty.id));
    const snackId   = duty.id;
    const timeoutId = setTimeout(() => {
      this.http.delete(`${this.API}/duty-requests/${duty.id}`).subscribe();
      this.snackbars.update(list => list.filter(s => s.id !== snackId));
    }, 10000);
    this.snackbars.update(list => [...list, {
      id: snackId, duty,
      message: `Request #${String(duty.id).padStart(4, '0')} removed`,
      timeoutId, remaining: 10,
      isEndorse: false,
    }]);
  }

  undoDelete(snackId: number) {
    const snack = this.snackbars().find(s => s.id === snackId);
    if (!snack) return;
    clearTimeout(snack.timeoutId);
    this.duties.update(list => [snack.duty, ...list].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ));
    this.snackbars.update(list => list.filter(s => s.id !== snackId));
    this.notif.show('Request restored', 'info');
  }

  dismissSnack(snackId: number) {
    const snack = this.snackbars().find(s => s.id === snackId);
    if (!snack) return;
    clearTimeout(snack.timeoutId);
    if (!snack.isEndorse) {
      this.http.delete(`${this.API}/duty-requests/${snack.duty.id}`).subscribe();
    } else {
      this.http.delete<Duty>(`${this.API}/duty-requests/${snack.duty.id}/endorse`).subscribe();
    }
    this.snackbars.update(list => list.filter(s => s.id !== snackId));
  }

  fetchActivityLog(dutyId: number) {
    return this.http.get<ActivityLog[]>(`${this.API}/duty-requests/${dutyId}/activity`);
  }
}