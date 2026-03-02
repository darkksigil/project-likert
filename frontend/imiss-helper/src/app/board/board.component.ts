// src/app/board/board.component.ts
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../navbar/navbar.component';
import { AddDutyModalComponent } from '../add-duty-modal/add-duty-modal.component';
import { RequestColumnComponent } from '../request-column/request-column.component';
import { SnackbarComponent } from '../snackbar/snackbar.component';
import { DutyService } from '../shared/services/duty.service';
import { AuthService } from '../shared/services/auth.service';
import { DepartmentService } from '../shared/services/department.service';
import { ConcernType, CONCERN_TYPE_LABELS } from '../shared/models/index';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NavbarComponent, AddDutyModalComponent,
    RequestColumnComponent, SnackbarComponent,
  ],
  templateUrl: './board.component.html',
})
export class BoardComponent implements OnInit {
  private dutyService = inject(DutyService);
  private auth        = inject(AuthService);
  private deptService = inject(DepartmentService);

  modalOpen = signal(false);
  loading   = this.dutyService.loading;
  isAdmin   = this.auth.isAdmin;

  // ── Today's date ──
  today = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  });

  // ── Search & Filter ──
  searchQuery         = signal('');
  activeConcernFilter = signal<ConcernType | 'all'>('all');

  concernTypes = Object.entries(CONCERN_TYPE_LABELS) as [ConcernType, string][];
  concernIcons: Record<string, string> = {
    hardware: '🔧', network: '🌐', system: '💻', data: '🗄', other: '📋'
  };

  // ── Board is the brain: all filtering lives here ──
  private filtered = computed(() => {
    const q    = this.searchQuery().toLowerCase().trim();
    const type = this.activeConcernFilter();

    return this.dutyService.duties().filter(d => {
      const matchType   = type === 'all' || (d.concern_type ?? 'other') === type;
      const matchSearch = !q ||
        (d.data.name ?? '').toLowerCase().includes(q) ||
        d.data.department.toLowerCase().includes(q) ||
        d.data.concern.toLowerCase().includes(q) ||
        String(d.id).includes(q);
      return matchType && matchSearch;
    });
  });

  // ── Columns receive pre-filtered data (dumb display) ──
  pending    = computed(() => this.filtered().filter(d => d.status === 'pending'));
  inProgress = computed(() => this.filtered().filter(d => d.status === 'in_progress'));
  done       = computed(() => this.filtered().filter(d => d.status === 'done'));

  get hasSearch(): boolean {
    return !!this.searchQuery() || this.activeConcernFilter() !== 'all';
  }

  ngOnInit() {
    this.dutyService.fetchAll().subscribe();
    this.deptService.fetchDepartments().subscribe();
  }

  clearSearch() {
    this.searchQuery.set('');
    this.activeConcernFilter.set('all');
  }

  setFilter(t: ConcernType | 'all') { this.activeConcernFilter.set(t); }
}