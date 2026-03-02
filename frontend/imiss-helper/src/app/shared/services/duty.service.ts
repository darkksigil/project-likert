// src/app/shared/services/duty.service.ts
import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { Duty, CreateDutyPayload, UpdateDutyPayload, DutyStatus, ConcernType, ActivityLog } from '../models/index';
import { NotificationService } from './notification.service';

export interface SnackbarItem {
  id:        number;
  duty:      Duty;
  message:   string;
  timeoutId: any;
  remaining: number;
}

const STATUS_LABELS: Record<DutyStatus, string> = {
  pending:     'Pending',
  in_progress: 'In Progress',
  done:        'Done',
  endorsed:    'Endorsed',
  failed:      'Failed',
};

@Injectable({ providedIn: 'root' })
export class DutyService {
  private readonly API = 'http://localhost:3000/api';
  private notif = inject(NotificationService);

  duties    = signal<Duty[]>([]);
  loading   = signal(true);
  snackbars = signal<SnackbarItem[]>([]);

  pending    = computed(() => this.duties().filter(d => d.status === 'pending'));
  inProgress = computed(() => this.duties().filter(d => d.status === 'in_progress'));
  done       = computed(() => this.duties().filter(d => d.status === 'done'));

  constructor(private http: HttpClient) {}

  fetchAll() {
    this.loading.set(true);
    return this.http.get<Duty[]>(`${this.API}/duty-requests`).pipe(
      tap({ next: d => { this.duties.set(d); this.loading.set(false); }, error: () => this.loading.set(false) })
    );
  }

  create(payload: CreateDutyPayload) {
    return this.http.post<Duty>(`${this.API}/duty-requests`, payload).pipe(
      tap(d => {
        this.duties.update(list => [d, ...list]);
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

  updateStatus(id: number, status: DutyStatus) {
    return this.http.patch<Duty>(`${this.API}/duty-requests/${id}`, { status }).pipe(
      tap(updated => {
        this.duties.update(list => list.map(d => d.id === id ? updated : d));
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

  deleteWithUndo(duty: Duty) {
    this.duties.update(list => list.filter(d => d.id !== duty.id));
    const snackId  = duty.id;
    const timeoutId = setTimeout(() => {
      this.http.delete(`${this.API}/duty-requests/${duty.id}`).subscribe();
      this.snackbars.update(list => list.filter(s => s.id !== snackId));
    }, 10000);
    this.snackbars.update(list => [...list, {
      id: snackId, duty,
      message: `Request #${String(duty.id).padStart(4, '0')} removed`,
      timeoutId, remaining: 10,
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
    this.http.delete(`${this.API}/duty-requests/${snack.duty.id}`).subscribe();
    this.snackbars.update(list => list.filter(s => s.id !== snackId));
  }

  fetchActivityLog(dutyId: number) {
    return this.http.get<ActivityLog[]>(`${this.API}/duty-requests/${dutyId}/activity`);
  }
}