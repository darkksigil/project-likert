// src/app/duty-card/duty-card.component.ts
import { Component, inject, input, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Duty, DutyStatus, ConcernType, ActivityLog,
  CONCERN_TYPE_LABELS, CONCERN_TYPE_COLORS
} from '../shared/models/index';
import { DutyService } from '../shared/services/duty.service';
import { AuthService } from '../shared/services/auth.service';
import { DepartmentService } from '../shared/services/department.service';
import { Department } from '../shared/models/index';
import { TimeAgoPipe, UrgencyClassPipe, formatTimeAgo } from '../shared/pipes/time-ago.pipes';

// Shared tick — updates once per minute for ALL cards, not per card
let _tick = signal(0);
setInterval(() => _tick.update(v => v + 1), 60000);

@Component({
  selector: 'app-duty-card',
  standalone: true,
  imports: [CommonModule, FormsModule, TimeAgoPipe, UrgencyClassPipe],
  templateUrl: './duty-card.component.html',
})
export class DutyCardComponent {
  duty = input.required<Duty>();

  private dutyService = inject(DutyService);
  private auth        = inject(AuthService);
  private deptService = inject(DepartmentService);

  isAdmin      = this.auth.isAdmin;
  menuOpen     = signal(false);
  actionLoading = signal(false);

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
  showLog    = signal(false);
  logItems   = signal<ActivityLog[]>([]);
  logLoading = signal(false);

  // ── Derived ──
  get displayName(): string  { return this.duty().data.name?.trim() || this.duty().data.department; }
  get showDept(): boolean    { return !!this.duty().data.name?.trim(); }
  get formattedId(): string  { return '#' + String(this.duty().id).padStart(4, '0'); }
  get concernLabel(): string { return CONCERN_TYPE_LABELS[this.duty().concern_type] ?? 'Other'; }
  get concernColor(): string { return CONCERN_TYPE_COLORS[this.duty().concern_type] ?? '#6B7280'; }

  // ── Refreshes every 60s via shared tick, not on every CD cycle ──
  timeAgo     = computed(() => { _tick(); return formatTimeAgo(this.duty().created_at); });
  urgencyClass = computed(() => {
    _tick();
    const diffH = (Date.now() - new Date(this.duty().created_at).getTime()) / 3600000;
    if (diffH > 24) return 'urgency-red';
    if (diffH > 8)  return 'urgency-yellow';
    return 'urgency-normal';
  });

  get formattedSubmitted(): string {
    const d = new Date(this.duty().created_at);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' – ' +
           d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  get lastUpdatedLabel(): string | null {
    const d = this.duty();
    if (!d.updated_at || !d.created_by_name) return null;
    const t = new Date(d.updated_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return `${d.created_by_name} – ${t}`;
  }

  // ── Context-based single action ──
  get primaryAction(): { label: string; next: DutyStatus; cls: string } {
    switch (this.duty().status) {
      case 'pending':     return { label: '▶ Start Work',    next: 'in_progress', cls: 'btn-primary-progress' };
      case 'in_progress': return { label: '✓ Mark as Done',  next: 'done',        cls: 'btn-primary-done'     };
      default:            return { label: '↩ Reopen',        next: 'pending',     cls: 'btn-primary-reopen'   };
    }
  }

  triggerAction() {
    this.actionLoading.set(true);
    this.dutyService.updateStatus(this.duty().id, this.primaryAction.next).subscribe({
      next:  () => this.actionLoading.set(false),
      error: () => this.actionLoading.set(false),
    });
  }

  remove() { this.dutyService.deleteWithUndo(this.duty()); }

  toggleMenu() { this.menuOpen.update(v => !v); }

  // Close menu on outside click
  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('.card-menu-wrap')) {
      this.menuOpen.set(false);
    }
  }

  // ── Edit ──
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
      name: this.editName().trim(), department: this.editDept(),
      concern: this.editConcern().trim(), localNum: this.editLocal().trim() || 'N/A',
      concernType: this.editType(),
    }).subscribe({
      next:  () => { this.saving.set(false); this.editing.set(false); },
      error: () => this.saving.set(false),
    });
  }

  // ── Activity log ──
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
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' – ' +
           d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  logActionLabel(log: ActivityLog): string {
    if (log.action === 'status_change') return `${log.from_value} → ${log.to_value}`;
    if (log.action === 'edit')   return 'Edited details';
    if (log.action === 'delete') return 'Deleted';
    return log.action;
  }
}