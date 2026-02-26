// src/app/board/duty-card/duty-card.component.ts
import { Component, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Duty, DutyStatus, ConcernType, CONCERN_TYPE_LABELS, CONCERN_TYPE_COLORS } from '../shared/models/index';
import { DutyService } from '../shared/services/duty.service';
import { AuthService } from '../shared/services/auth.service';

@Component({
  selector: 'app-duty-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './duty-card.component.html',
})
export class DutyCardComponent {
  duty = input.required<Duty>();

  private dutyService = inject(DutyService);
  private auth        = inject(AuthService);

  isAdmin        = this.auth.isAdmin;
  reassigning    = signal(false);
  selectedType   = signal<ConcernType>('other');
  concernTypes   = Object.keys(CONCERN_TYPE_LABELS) as ConcernType[];
  concernLabels  = CONCERN_TYPE_LABELS;

  get displayName(): string {
    return this.duty().data.name?.trim() || this.duty().data.department;
  }

  get showDept(): boolean { return !!this.duty().data.name?.trim(); }

  get formattedId(): string { return '#' + String(this.duty().id).padStart(4, '0'); }

  get formattedTime(): string {
    const d = new Date(this.duty().created_at);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
           d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  get concernLabel(): string { return CONCERN_TYPE_LABELS[this.duty().concern_type] ?? 'Other'; }
  get concernColor(): string { return CONCERN_TYPE_COLORS[this.duty().concern_type] ?? '#6B7280'; }

  moveTo(status: DutyStatus) {
    this.dutyService.updateStatus(this.duty().id, status).subscribe();
  }

  cancel() { this.dutyService.delete(this.duty().id).subscribe(); }

  // ✅ Admin reassign concern type
  openReassign() {
    this.selectedType.set(this.duty().concern_type ?? 'other');
    this.reassigning.set(true);
  }

  confirmReassign() {
    this.dutyService.updateConcernType(this.duty().id, this.selectedType()).subscribe({
      next: () => this.reassigning.set(false)
    });
  }
}