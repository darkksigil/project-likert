// src/app/board/board.component.ts
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../navbar/navbar.component';
import { AddDutyModalComponent } from '../add-duty-modal/add-duty-modal.component';
import { DutyService } from '../shared/services/duty.service';
import { AuthService } from '../shared/services/auth.service';
import { DepartmentService } from '../shared/services/department.service';
import { DutyCardComponent } from '../duty-card/duty-card.component';
import { SnackbarComponent } from '../snackbar/snackbar.component';
import { ConcernType, CONCERN_TYPE_LABELS } from '../shared/models/index';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, AddDutyModalComponent, DutyCardComponent, SnackbarComponent],
  templateUrl: './board.component.html',
})
export class BoardComponent implements OnInit {
  private dutyService  = inject(DutyService);
  private auth         = inject(AuthService);
  private deptService  = inject(DepartmentService);

  modalOpen = signal(false);
  loading   = this.dutyService.loading;
  skeletons = [1, 2, 3];

  isAdmin     = this.auth.isAdmin;
  currentRole = computed(() => this.auth.currentUser()?.role ?? 'other');

  searchQuery         = signal('');
  activeConcernFilter = signal<ConcernType | 'all'>('all');

  concernTypes = Object.entries(CONCERN_TYPE_LABELS) as [ConcernType, string][];
  concernIcons: Record<string, string> = {
    hardware: '🔧', network: '🌐', system: '💻', data: '🗄', other: '📋'
  };

  private filtered = computed(() => {
    const q      = this.searchQuery().toLowerCase().trim();
    const filter = this.activeConcernFilter();
    return this.dutyService.duties().filter(d => {
      const matchType   = filter === 'all' || (d.concern_type ?? 'other') === filter;
      const matchSearch = !q ||
        (d.data.name ?? '').toLowerCase().includes(q) ||
        d.data.department.toLowerCase().includes(q) ||
        d.data.concern.toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  });

  pending    = computed(() => this.filtered().filter(d => d.status === 'pending'));
  inProgress = computed(() => this.filtered().filter(d => d.status === 'in_progress'));
  done       = computed(() => this.filtered().filter(d => d.status === 'done'));

  ngOnInit() {
    this.dutyService.fetchAll().subscribe();
    this.deptService.fetchDepartments().subscribe();
  }

  clearSearch() { this.searchQuery.set(''); }
  setFilter(t: ConcernType | 'all') { this.activeConcernFilter.set(t); }
}