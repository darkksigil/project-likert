// src/app/shared/services/notif-filter.service.ts
import { Injectable, signal } from '@angular/core';
import { ConcernType } from '../models/index';

const STORAGE_KEY = 'notif_concern_filter';

@Injectable({ providedIn: 'root' })
export class NotifFilterService {

  // 'all' or array of concern types
  enabledTypes = signal<ConcernType[] | 'all'>(this.load());

  private load(): ConcernType[] | 'all' {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored || stored === 'all') return 'all';
    try { return JSON.parse(stored); } catch { return 'all'; }
  }

  save(types: ConcernType[] | 'all') {
    this.enabledTypes.set(types);
    localStorage.setItem(STORAGE_KEY, types === 'all' ? 'all' : JSON.stringify(types));
  }

  shouldNotify(concernType: string): boolean {
    const types = this.enabledTypes();
    if (types === 'all') return true;
    return types.includes(concernType as ConcernType);
  }
}