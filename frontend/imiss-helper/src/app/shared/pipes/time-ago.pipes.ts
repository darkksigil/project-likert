// src/app/shared/pipes/time-ago.pipe.ts
import { Pipe, PipeTransform, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';

// ── Pure pipe — only recalculates when input changes ──
// A global interval ticks every 60s to trigger refresh via markForCheck()

@Pipe({ name: 'timeAgo', standalone: true, pure: true })
export class TimeAgoPipe implements PipeTransform {
  transform(value: string): string {
    return formatTimeAgo(value);
  }
}

@Pipe({ name: 'urgencyClass', standalone: true, pure: true })
export class UrgencyClassPipe implements PipeTransform {
  transform(value: string): string {
    const diffH = (Date.now() - new Date(value).getTime()) / 3600000;
    if (diffH > 24) return 'urgency-red';
    if (diffH > 8)  return 'urgency-yellow';
    return 'urgency-normal';
  }
}

export function formatTimeAgo(value: string): string {
  const diffMs  = Date.now() - new Date(value).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH   = Math.floor(diffMin / 60);
  const diffD   = Math.floor(diffH / 24);

  if (diffMin < 1)  return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffH   < 24) return `${diffH}h ${diffMin % 60}m ago`;
  return `${diffD}d ago`;
}