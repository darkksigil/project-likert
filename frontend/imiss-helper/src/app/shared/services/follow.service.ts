// src/app/shared/services/follow.service.ts (FRONTEND)
import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FollowService {
  private readonly API = 'http://localhost:3000/api';
  private http = inject(HttpClient);

  // Set of followed duty IDs
  followedIds = signal<Set<number>>(new Set());

  fetchFollowing() {
    return this.http.get<{ ids: number[] }>(`${this.API}/duty-requests/following`).pipe(
      tap(res => this.followedIds.set(new Set(res.ids)))
    );
  }

  isFollowing(dutyId: number): boolean {
    return this.followedIds().has(dutyId);
  }

  follow(dutyId: number) {
    return this.http.post(`${this.API}/duty-requests/${dutyId}/follow`, {}).pipe(
      tap(() => {
        const updated = new Set(this.followedIds());
        updated.add(dutyId);
        this.followedIds.set(updated);
      })
    );
  }

  unfollow(dutyId: number) {
    return this.http.delete(`${this.API}/duty-requests/${dutyId}/follow`).pipe(
      tap(() => {
        const updated = new Set(this.followedIds());
        updated.delete(dutyId);
        this.followedIds.set(updated);
      })
    );
  }

  toggle(dutyId: number) {
    return this.isFollowing(dutyId)
      ? this.unfollow(dutyId)
      : this.follow(dutyId);
  }

  // Clean up local state when duty is archived/deleted
  remove(dutyId: number) {
    const updated = new Set(this.followedIds());
    updated.delete(dutyId);
    this.followedIds.set(updated);
  }
}