// src/app/shared/services/duty.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { Duty, CreateDutyPayload, DutyStatus, ConcernType } from '../models/index';

@Injectable({ providedIn: 'root' })
export class DutyService {
  private readonly API = 'http://localhost:3000/api';

  duties  = signal<Duty[]>([]);
  loading = signal(true);

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

  updateStatus(id: number, status: DutyStatus) {
    return this.http.patch<Duty>(`${this.API}/duty-requests/${id}`, { status }).pipe(
      tap(updated => this.duties.update(list => list.map(d => d.id === id ? updated : d)))
    );
  }

  // ✅ Admin only — reassign concern type
  updateConcernType(id: number, concernType: ConcernType) {
    return this.http.patch<Duty>(`${this.API}/duty-requests/${id}/concern-type`, { concernType }).pipe(
      tap(updated => this.duties.update(list => list.map(d => d.id === id ? updated : d)))
    );
  }

  delete(id: number) {
    return this.http.delete(`${this.API}/duty-requests/${id}`).pipe(
      tap(() => this.duties.update(list => list.filter(d => d.id !== id)))
    );
  }
}