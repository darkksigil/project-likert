// src/app/add-duty-modal/add-duty-modal.component.ts
import { Component, inject, model, output, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DutyService } from '../shared/services/duty.service';
import { DepartmentService } from '../shared/services/department.service';
import { ConcernType, Department } from '../shared/models/index';

@Component({
  selector: 'app-add-duty-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-duty-modal.component.html',
})
export class AddDutyModalComponent implements OnInit {
  isOpen    = model(false);
  submitted = output<void>();

  private dutyService = inject(DutyService);
  private deptService = inject(DepartmentService);

  name        = '';
  department  = '';
  concern     = '';
  localNum    = '';
  concernType: ConcernType = 'other';
  loading      = false;
  deptLoading  = false;
  error        = '';

  departments = computed(() => this.deptService.departments());
  deptError   = computed(() => this.deptService.loadError());

  get groupedDepts(): Record<string, Department[]> {
    const groups: Record<string, Department[]> = {};
    this.departments().filter(d => d.is_active).forEach(d => {
      const g = d.grp || 'Other';
      if (!groups[g]) groups[g] = [];
      groups[g].push(d);
    });
    return groups;
  }

  get groupKeys(): string[]  { return Object.keys(this.groupedDepts); }
  get isValid(): boolean     { return !!this.department && !!this.concern.trim(); }
  get deptReady(): boolean   { return this.departments().length > 0; }

  ngOnInit() {
    // Re-fetch if empty (safety net in case board fetch failed)
    if (this.deptService.departments().length === 0) {
      this.deptLoading = true;
      this.deptService.fetchDepartments().subscribe({
        next:  () => this.deptLoading = false,
        error: () => this.deptLoading = false,
      });
    }
  }

  close() { this.isOpen.set(false); this.reset(); }

  onOverlayClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) this.close();
  }

  retryLoadDepts() {
    this.deptLoading = true;
    this.deptService.fetchDepartments().subscribe({
      next:  () => this.deptLoading = false,
      error: () => this.deptLoading = false,
    });
  }

  submit() {
    if (!this.isValid) { this.error = 'Please fill in department and concern.'; return; }
    this.loading = true; this.error = '';
    this.dutyService.create({
      name:        this.name.trim() || '',
      department:  this.department,
      concern:     this.concern.trim(),
      localNum:    this.localNum.trim() || 'N/A',
      concernType: this.concernType,
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