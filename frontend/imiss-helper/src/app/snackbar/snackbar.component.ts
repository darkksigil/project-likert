// src/app/snackbar/snackbar.component.ts
import { Component, inject, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DutyService } from '../shared/services/duty.service';
import { NotificationService } from '../shared/services/notification.service';

@Component({
  selector: 'app-snackbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './snackbar.component.html',
})
export class SnackbarComponent implements OnDestroy {
  dutyService = inject(DutyService);
  notif       = inject(NotificationService);

  snackbars = this.dutyService.snackbars;
  toasts    = this.notif.toasts;

  private countdownIntervals = new Map<number, any>();

  constructor() {
    effect(() => {
      const current = this.snackbars();
      current.forEach(snack => {
        if (!this.countdownIntervals.has(snack.id)) {
          const interval = setInterval(() => {
            this.dutyService.snackbars.update(list =>
              list.map(s => s.id === snack.id
                ? { ...s, remaining: Math.max(0, s.remaining - 1) }
                : s
              )
            );
          }, 1000);
          this.countdownIntervals.set(snack.id, interval);
        }
      });
      this.countdownIntervals.forEach((interval, id) => {
        if (!current.find(s => s.id === id)) {
          clearInterval(interval);
          this.countdownIntervals.delete(id);
        }
      });
    });
  }

  undo(snackId: number) {
    this.clearCountdown(snackId);
    this.dutyService.undoDelete(snackId);
  }

  dismiss(snackId: number) {
    this.clearCountdown(snackId);
    this.dutyService.dismissSnack(snackId);
  }

  private clearCountdown(snackId: number) {
    const i = this.countdownIntervals.get(snackId);
    if (i) { clearInterval(i); this.countdownIntervals.delete(snackId); }
  }

  ngOnDestroy() { this.countdownIntervals.forEach(i => clearInterval(i)); }
}