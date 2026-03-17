// src/app/board/board.component.ts
import { Component, inject, OnInit, signal, computed, effect, ViewEncapsulation } from '@angular/core';
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
import { FollowService } from '../shared/services/follow.service';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NavbarComponent, AddDutyModalComponent,
    DutyCardComponent, SnackbarComponent,
  ],
  templateUrl: './board.component.html',
  styleUrl: './board.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class BoardComponent implements OnInit {
  private followService = inject(FollowService);
  private dutyService = inject(DutyService);
  private auth        = inject(AuthService);
  private deptService = inject(DepartmentService);

  modalOpen = signal(false);
  loading   = this.dutyService.loading;
  isAdmin   = this.auth.isAdmin;

  today = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  });

  searchQuery         = signal('');
  activeConcernFilter = signal<ConcernType | 'all'>('all');
  concernTypes        = Object.entries(CONCERN_TYPE_LABELS) as [ConcernType, string][];

  // ── Per-column slide index ──
  pendingIndex  = signal(0);
  progressIndex = signal(0);
  doneIndex     = signal(0);

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

  pending    = computed(() => this.filtered().filter(d => d.status === 'pending'));
  inProgress = computed(() => this.filtered().filter(d => d.status === 'in_progress'));
  done       = computed(() => this.filtered().filter(d => d.status === 'done'));

  endorsedToMe     = this.dutyService.endorsedToMe;
  endorsementCount = this.dutyService.endorsementCount;
  hasEndorsements  = computed(() => this.endorsedToMe().length > 0);

  get hasSearch(): boolean {
    return !!this.searchQuery() || this.activeConcernFilter() !== 'all';
  }

  constructor() {
    // Reset indexes when filtered data changes so we don't go out of bounds
    effect(() => {
      const p = this.pending().length;
      const r = this.inProgress().length;
      const d = this.done().length;
      if (this.pendingIndex()  >= p && p > 0) this.pendingIndex.set(p - 1);
      if (this.pendingIndex()  >= p && p === 0) this.pendingIndex.set(0);
      if (this.progressIndex() >= r && r > 0) this.progressIndex.set(r - 1);
      if (this.progressIndex() >= r && r === 0) this.progressIndex.set(0);
      if (this.doneIndex()     >= d && d > 0) this.doneIndex.set(d - 1);
      if (this.doneIndex()     >= d && d === 0) this.doneIndex.set(0);
    });
  }

  // ── Navigation ──
  next(col: 'pending' | 'progress' | 'done') {
    const map = {
      pending:  { idx: this.pendingIndex,  max: this.pending().length },
      progress: { idx: this.progressIndex, max: this.inProgress().length },
      done:     { idx: this.doneIndex,     max: this.done().length },
    };
    const { idx, max } = map[col];
    if (idx() < max - 1) idx.update(v => v + 1);
  }

  prev(col: 'pending' | 'progress' | 'done') {
    const map = {
      pending:  this.pendingIndex,
      progress: this.progressIndex,
      done:     this.doneIndex,
    };
    const idx = map[col];
    if (idx() > 0) idx.update(v => v - 1);
  }

  ngOnInit() {
    this.dutyService.fetchAll().subscribe();
    this.dutyService.fetchEndorsedToMe().subscribe();
    this.deptService.fetchDepartments().subscribe();
    this.followService.fetchFollowing().subscribe();
  }

  clearSearch() {
    this.searchQuery.set('');
    this.activeConcernFilter.set('all');
  }

  setFilter(t: ConcernType | 'all') { this.activeConcernFilter.set(t); }
}