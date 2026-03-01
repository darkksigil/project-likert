// src/app/duty-card/duty-card.component.ts
import { Component, inject, input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Duty, DutyStatus, ConcernType, ActivityLog, CONCERN_TYPE_LABELS, CONCERN_TYPE_COLORS } from '../shared/models/index';
import { DutyService } from '../shared/services/duty.service';
import { AuthService } from '../shared/services/auth.service';
import { DepartmentService } from '../shared/services/department.service';
import { Department } from '../shared/models/index';

@Component({
  selector: 'app-duty-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './duty-card.component.html',
})
export class DutyCardComponent {
  duty = input.required<Duty>();

  private dutyService  = inject(DutyService);
  private auth         = inject(AuthService);
  private deptService  = inject(DepartmentService);

  isAdmin       = this.auth.isAdmin;
  reassigning   = signal(false);
  selectedType  = signal<ConcernType>('other');
  concernTypes  = Object.keys(CONCERN_TYPE_LABELS) as ConcernType[];
  concernLabels = CONCERN_TYPE_LABELS;

  // ── Edit mode ──
  editing     = signal(false);
  editName    = signal('');
  editDept    = signal('');
  editConcern = signal('');
  editLocal   = signal('');
  editType    = signal<ConcernType>('other');
  saving      = signal(false);

  departments = computed(() => this.deptService.departments());

  get groupedDepts(): Record<string, Department[]> {
    const groups: Record<string, Department[]> = {};
    this.departments().filter(d => d.is_active).forEach(d => {
      const g = d.grp || 'Other';
      if (!groups[g]) groups[g] = [];
      groups[g].push(d);
    });
    return groups;
  }
  get groupKeys(): string[] { return Object.keys(this.groupedDepts); }

  // ── Activity log ──
  showLog  = signal(false);
  logItems = signal<ActivityLog[]>([]);
  logLoading = signal(false);

  get displayName(): string {
    return this.duty().data.name?.trim() || this.duty().data.department;
  }
  get showDept(): boolean  { return !!this.duty().data.name?.trim(); }
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

  // ✅ X button → undo snackbar
  remove() {
    this.dutyService.deleteWithUndo(this.duty());
  }

  // ✅ Edit mode — all users
  startEdit() {
    const d = this.duty();
    this.editName.set(d.data.name ?? '');
    this.editDept.set(d.data.department);
    this.editConcern.set(d.data.concern);
    this.editLocal.set(d.data.localNum ?? '');
    this.editType.set(d.concern_type ?? 'other');
    this.editing.set(true);
  }

  cancelEdit() { this.editing.set(false); }

  saveEdit() {
    if (!this.editDept() || !this.editConcern().trim()) return;
    this.saving.set(true);
    this.dutyService.update(this.duty().id, {
      name:        this.editName().trim(),
      department:  this.editDept(),
      concern:     this.editConcern().trim(),
      localNum:    this.editLocal().trim() || 'N/A',
      concernType: this.editType(),
    }).subscribe({
      next:  () => { this.saving.set(false); this.editing.set(false); },
      error: () => this.saving.set(false),
    });
  }

  // ✅ Activity log toggle
  toggleLog() {
    if (this.showLog()) { this.showLog.set(false); return; }
    this.showLog.set(true);
    this.logLoading.set(true);
    this.dutyService.fetchActivityLog(this.duty().id).subscribe({
      next:  logs => { this.logItems.set(logs); this.logLoading.set(false); },
      error: ()   => this.logLoading.set(false),
    });
  }

  formatLogTime(ts: string): string {
    const d = new Date(ts);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
           d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  logActionLabel(log: ActivityLog): string {
    if (log.action === 'status_change') {
      return `${log.from_value} → ${log.to_value}`;
    }
    if (log.action === 'edit') return 'Edited details';
    if (log.action === 'delete') return 'Deleted';
    return log.action;
  }

  // ── Admin reassign ──
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