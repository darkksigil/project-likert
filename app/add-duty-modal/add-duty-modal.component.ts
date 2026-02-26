// src/app/board/add-duty-modal/add-duty-modal.component.ts
import { Component, inject, model, OnInit, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DutyService } from '../shared/services/duty.service';
import { AdminService } from '../shared/services/admin.service';
import { AuthService } from '../shared/services/auth.service';
import { ConcernType, Department, ROLE_LABELS } from '../shared/models/index';

@Component({
  selector: 'app-add-duty-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-duty-modal.component.html',
})
export class AddDutyModalComponent implements OnInit {
  isOpen    = model(false);
  submitted = output<void>();

  private dutyService  = inject(DutyService);
  private adminService = inject(AdminService);
  private auth         = inject(AuthService);

  name        = '';
  department  = '';
  concern     = '';
  localNum    = '';
  // ✅ Only admin sees/sets this — regular users auto-assign by role
  concernType: ConcernType = 'other';
  loading     = false;
  error       = '';

  departments = computed(() => this.adminService.departments());
  isAdmin     = computed(() => this.auth.isAdmin());
  currentRole = computed(() => this.auth.currentUser()?.role ?? 'other');

  // ✅ Show what type will be auto-assigned for current user
  get autoAssignedType(): string {
    const map: Record<string, string> = {
      hardware:       'Hardware',
      system:         'System',
      data:           'Data',
      cybersecurity:  'Network',
      administrative: 'Other',
    };
    return map[this.currentRole()] ?? 'Other';
  }

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

  get isValid(): boolean { return !!this.department && !!this.concern.trim(); }

  ngOnInit() {
    if (this.adminService.departments().length === 0) {
      this.adminService.fetchDepartments().subscribe();
    }
  }

  close() { this.isOpen.set(false); this.reset(); }

  onOverlayClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) this.close();
  }

  submit() {
    if (!this.isValid) { this.error = 'Please fill in department and concern.'; return; }
    this.loading = true; this.error = '';
    this.dutyService.create({
      name:        this.name.trim() || '',
      department:  this.department,
      concern:     this.concern.trim(),
      localNum:    this.localNum.trim() || 'N/A',
      // Admin sets manually; regular users: backend ignores and auto-sets by role
      concernType: this.isAdmin() ? this.concernType : this.concernType,
    }).subscribe({
      next:  () => { this.loading = false; this.close(); this.submitted.emit(); },
      error: () => { this.loading = false; this.error = 'Failed to submit. Is the server running?'; }
    });
  }

  private reset() {
    this.name = ''; this.department = ''; this.concern = '';
    this.localNum = ''; this.concernType = 'other'; this.error = ''; this.loading = false;
  }
}