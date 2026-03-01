// src/app/snackbar/snackbar.component.ts
import { Component, inject, OnDestroy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DutyService, SnackbarItem } from '../shared/services/duty.service';

@Component({
  selector: 'app-snackbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './snackbar.component.html',
})
export class SnackbarComponent implements OnDestroy {
  dutyService = inject(DutyService);
  snackbars   = this.dutyService.snackbars;

  // Track countdown timers per snack
  private countdownIntervals = new Map<number, any>();

  constructor() {
    // Watch snackbars and start countdown intervals for new ones
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

      // Clean up intervals for dismissed snacks
      this.countdownIntervals.forEach((interval, id) => {
        if (!current.find(s => s.id === id)) {
          clearInterval(interval);
          this.countdownIntervals.delete(id);
        }
      });
    });
  }

  undo(snackId: number) {
    this.clearInterval(snackId);
    this.dutyService.undoDelete(snackId);
  }

  dismiss(snackId: number) {
    this.clearInterval(snackId);
    this.dutyService.dismissSnack(snackId);
  }

  private clearInterval(snackId: number) {
    const interval = this.countdownIntervals.get(snackId);
    if (interval) { clearInterval(interval); this.countdownIntervals.delete(snackId); }
  }

  ngOnDestroy() {
    this.countdownIntervals.forEach(i => clearInterval(i));
  }
}