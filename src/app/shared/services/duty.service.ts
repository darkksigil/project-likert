// src/app/shared/services/duty.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { Duty, CreateDutyPayload, UpdateDutyPayload, DutyStatus, ConcernType, ActivityLog } from '../models/index';

export interface SnackbarItem {
  id:        number;
  duty:      Duty;
  message:   string;
  timeoutId: any;
  remaining: number; // seconds
}

@Injectable({ providedIn: 'root' })
export class DutyService {
  private readonly API = 'http://localhost:3000/api';

  duties   = signal<Duty[]>([]);
  loading  = signal(true);
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
      tap(d => this.duties.update(list => [d, ...list]))
    );
  }

  // ✅ Update duty details (all users)
  update(id: number, payload: UpdateDutyPayload) {
    return this.http.patch<Duty>(`${this.API}/duty-requests/${id}/details`, payload).pipe(
      tap(updated => this.duties.update(list => list.map(d => d.id === id ? updated : d)))
    );
  }

  updateStatus(id: number, status: DutyStatus) {
    return this.http.patch<Duty>(`${this.API}/duty-requests/${id}`, { status }).pipe(
      tap(updated => this.duties.update(list => list.map(d => d.id === id ? updated : d)))
    );
  }

  updateConcernType(id: number, concernType: ConcernType) {
    return this.http.patch<Duty>(`${this.API}/duty-requests/${id}/concern-type`, { concernType }).pipe(
      tap(updated => this.duties.update(list => list.map(d => d.id === id ? updated : d)))
    );
  }

  // ✅ Soft delete with undo snackbar
  deleteWithUndo(duty: Duty) {
    // Optimistically remove from UI
    this.duties.update(list => list.filter(d => d.id !== duty.id));

    const snackId = duty.id;
    const timeoutId = setTimeout(() => {
      // Actually delete after 10s
      this.http.delete(`${this.API}/duty-requests/${duty.id}`).subscribe();
      this.snackbars.update(list => list.filter(s => s.id !== snackId));
    }, 10000);

    this.snackbars.update(list => [...list, {
      id: snackId,
      duty,
      message: `Request #${String(duty.id).padStart(4, '0')} removed`,
      timeoutId,
      remaining: 10,
    }]);
  }

  // ✅ Undo delete
  undoDelete(snackId: number) {
    const snack = this.snackbars().find(s => s.id === snackId);
    if (!snack) return;
    clearTimeout(snack.timeoutId);
    this.duties.update(list => [snack.duty, ...list].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ));
    this.snackbars.update(list => list.filter(s => s.id !== snackId));
  }

  dismissSnack(snackId: number) {
    const snack = this.snackbars().find(s => s.id === snackId);
    if (!snack) return;
    clearTimeout(snack.timeoutId);
    this.http.delete(`${this.API}/duty-requests/${snack.duty.id}`).subscribe();
    this.snackbars.update(list => list.filter(s => s.id !== snackId));
  }

  // ✅ Activity log
  fetchActivityLog(dutyId: number) {
    return this.http.get<ActivityLog[]>(`${this.API}/duty-requests/${dutyId}/activity`);
  }
}