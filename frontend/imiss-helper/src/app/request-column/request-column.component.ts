// src/app/request-column/request-column.component.ts
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DutyCardComponent } from '../duty-card/duty-card.component';
import { Duty, DutyStatus } from '../shared/models/index';

interface ColConfig {
  cls:       string;
  emptyIcon: string;
  emptyText: string;
  skeletons: number[];
}

const COL_CONFIGS: Record<string, ColConfig> = {
  pending:     { cls: 'col-pending',  emptyIcon: '◷', emptyText: 'No pending requests',  skeletons: [1, 2, 3] },
  in_progress: { cls: 'col-progress', emptyIcon: '◎', emptyText: 'No active requests',   skeletons: [1, 2]    },
  done:        { cls: 'col-done',     emptyIcon: '✓', emptyText: 'No completed requests', skeletons: [1]       },
};

@Component({
  selector: 'app-request-column',
  standalone: true,
  imports: [CommonModule, DutyCardComponent],
  templateUrl: './request-column.component.html',
})
export class RequestColumnComponent {
  // Inputs from board (dumb display — board is the brain)
  duties  = input.required<Duty[]>();
  status  = input.required<DutyStatus>();
  title   = input.required<string>();
  loading = input(false);
  searchActive = input(false);

  get config(): ColConfig {
    return COL_CONFIGS[this.status()] ?? COL_CONFIGS['pending'];
  }

  get emptyText(): string {
    return this.searchActive() ? 'No results found' : this.config.emptyText;
  }
}