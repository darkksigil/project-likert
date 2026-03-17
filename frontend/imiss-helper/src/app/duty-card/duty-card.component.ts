// src/app/duty-card/duty-card.component.ts
import { Component, inject, input, signal, computed, HostListener, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Duty, DutyStatus, ConcernType, ActivityLog,
  CONCERN_TYPE_LABELS, CONCERN_TYPE_COLORS
} from '../shared/models/index';
import { DutyService } from '../shared/services/duty.service';
import { AuthService } from '../shared/services/auth.service';
import { DepartmentService } from '../shared/services/department.service';
import { AdminService } from '../shared/services/admin.service';
import { Department } from '../shared/models/index';
import { formatTimeAgo } from '../shared/pipes/time-ago.pipes';
import { JoService, JOResult } from '../shared/services/jo.service';
import { FollowService } from '../shared/services/follow.service';

let _tick = signal(0);
setInterval(() => _tick.update(v => v + 1), 60000);

@Component({
  selector: 'app-duty-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './duty-card.component.html',
  styleUrl: './duty-card.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class DutyCardComponent {
  duty = input.required<Duty>();

  private dutyService  = inject(DutyService);
  private auth         = inject(AuthService);
  private deptService  = inject(DepartmentService);
  private adminService = inject(AdminService);
  private joService    = inject(JoService);
  private followService = inject(FollowService);

  isAdmin       = this.auth.isAdmin;
  menuOpen      = signal(false);
  actionLoading = signal(false);

  // ── JO verification ──
  joMode       = signal(false);
  joInput      = signal('');
  joInputError = signal('');
  joResult     = signal<JOResult | null>(null);
  joVerifying  = signal(false);
  joConfirming = signal(false);

  // ── Endorsement ──
  endorseMode = signal(false);
  endorseToId = signal<number | ''>('');
  endorsing   = signal(false);

  // All users except current user
  otherUsers = computed(() =>
    this.adminService.users().filter(u =>
      u.is_active && u.id !== this.auth.currentUser()?.id
    )
  );

  //Following status
  isFollowing = computed(() => this.followService.isFollowing(this.duty().id));

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

  get joBadge(): 'verified' | 'skipped' | null {
    const d = this.duty();
    if (d.status !== 'done') return null;
    if (d.jo_verified === true)  return 'verified';
    if (d.jo_verified === false) return 'skipped';
    return null;
  }

   get primaryAction(): { label: string; next: DutyStatus; cls: string } {
    const role = this.auth.currentUser()?.role;
    switch (this.duty().status) {
      case 'pending':
        return { label: "Start Work", next: 'in_progress', cls: 'btn-primary-progress' };
      case 'in_progress':
        return { label: "Mark as Done", next: 'done', cls: 'btn-primary-done' };
      case 'endorsed':
        // admin + duty skip straight to done, regular users must start work first
        if (role === 'admin' || role === 'duty') {
          return { label: "Mark as Done", next: 'done', cls: 'btn-primary-done' };
        }
        return { label: "Start Work", next: 'in_progress', cls: 'btn-primary-progress' };
      default:
        return { label: "Reopen", next: 'pending', cls: 'btn-primary-reopen' };
    }
  }

  get formattedFinished(): string {
    const d = new Date(this.duty().updated_at ?? this.duty().created_at);
    return 'Done ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' – ' +
          d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  triggerAction() {
    if (this.primaryAction.next === 'done') {
      this.joMode.set(true);
      this.joInput.set('');
      this.joInputError.set('');
      this.joResult.set(null);
      return;
    }
    this.executeStatusChange(this.primaryAction.next);
  }

  // ── Endorse ──
  openEndorse() {
    // Fetch users if not loaded yet
    if (this.adminService.users().length === 0) {
      this.adminService.fetchUsers().subscribe();
    }
    this.endorseMode.set(true);
    this.endorseToId.set('');
  }

  cancelEndorse() {
    this.endorseMode.set(false);
    this.endorseToId.set('');
  }

  confirmEndorse() {
    const toId = this.endorseToId();
    if (!toId) return;
    this.endorsing.set(true);
    this.dutyService.endorse(this.duty().id, Number(toId)).subscribe({
      next:  () => { this.endorsing.set(false); this.endorseMode.set(false); },
      error: () => this.endorsing.set(false),
    });
  }

  // ── JO flow ──
  onJoInput(value: string) {
    const digitsOnly = value.replace(/\D/g, '');
    this.joInput.set(digitsOnly);
    this.joResult.set(null);
    this.joInputError.set(
      value !== digitsOnly && value.length > 0
        ? 'Numbers only — no letters or symbols.'
        : ''
    );
  }

  verifyJO() {
    const input = this.joInput().trim();
    if (!input) return;
    if (!/^\d{4,6}$/.test(input)) {
      this.joInputError.set('Enter a 4–6 digit job order number.');
      return;
    }
    this.joVerifying.set(true);
    this.joInputError.set('');
    this.joResult.set(null);

    this.joService.verify(input).subscribe({
      next: result => {
        this.joResult.set(result);
        this.joVerifying.set(false);
        if (result.found) {
          setTimeout(() => this.executeStatusChange('done', result.jo_number, true), 800);
        }
      },
      error: () => {
        this.joResult.set({ found: false, error: 'Could not reach job order database.' });
        this.joVerifying.set(false);
      }
    });
  }

  skipJO() { this.executeStatusChange('done', undefined, false); }

  cancelJO() {
    this.joMode.set(false);
    this.joInput.set('');
    this.joInputError.set('');
    this.joResult.set(null);
  }

  private executeStatusChange(status: DutyStatus, joNumber?: string, joVerified?: boolean) {
    this.actionLoading.set(true);
    this.joConfirming.set(true);
    this.dutyService.updateStatus(this.duty().id, status, joNumber, joVerified).subscribe({
      next:  () => { this.actionLoading.set(false); this.joConfirming.set(false); this.joMode.set(false); },
      error: () => { this.actionLoading.set(false); this.joConfirming.set(false); },
    });
  }

  remove() {
    if (this.duty().status === 'endorsed' &&
        Number(this.duty().endorsed_to) === Number(this.auth.currentUser()?.id)) {
      this.dutyService.unendorse(this.duty().id);
    } else {
      this.dutyService.deleteWithUndo(this.duty());
    }
  }
  toggleMenu() { this.menuOpen.update(v => !v); }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('.card-menu-wrap')) this.menuOpen.set(false);
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

  timeAgo = computed(() => {
    const d = this.duty();
    if (d.status === 'done') return formatTimeAgo(d.updated_at ?? d.created_at);
    _tick();
    return formatTimeAgo(d.created_at);
  });
  urgencyClass = computed(() => {
    if (this.duty().status === 'done') return 'urgency-normal';
    _tick();
    const diffH = (Date.now() - new Date(this.duty().created_at).getTime()) / 3600000;
    if (diffH > 24) return 'urgency-red';
    if (diffH > 8)  return 'urgency-yellow';
    return 'urgency-normal';
  });

  toggleFollow() {
    this.followService.toggle(this.duty().id).subscribe();
  }
  
}