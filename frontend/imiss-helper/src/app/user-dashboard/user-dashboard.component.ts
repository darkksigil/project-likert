// src/app/user-dashboard/user-dashboard.component.ts
import { Component, inject, signal, computed, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { SnackbarComponent } from '../snackbar/snackbar.component';
import { DashboardService, DashboardFilter, DashboardRecord, DashboardStats } from '../shared/services/dashboard.service';
import { AuthService } from '../shared/services/auth.service';
import { DutyService } from '../shared/services/duty.service';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { effect } from '@angular/core';
import { AddDutyModalComponent } from '../add-duty-modal/add-duty-modal.component';

const STATUS_COLORS: Record<string, string> = {
  pending:     '#92400E',
  in_progress: '#1E3A8A',
  done:        '#166534',
  endorsed:    '#5B21B6',
  failed:      '#991B1B',
};

const STATUS_BG: Record<string, string> = {
  pending:     '#FEF3C7',
  in_progress: '#DBEAFE',
  done:        '#DCFCE7',
  endorsed:    '#EDE9FE',
  failed:      '#FEE2E2',
};

const CONCERN_LABELS: Record<string, string> = {
  hardware: 'Hardware', network: 'Network',
  system: 'System', data: 'Data', other: 'Other',
};

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  styleUrl: './user-dashboard.component.css',
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    NavbarComponent, SnackbarComponent,
    MatDatepickerModule, MatNativeDateModule,
    MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule,AddDutyModalComponent,
  ],
  templateUrl: './user-dashboard.component.html',
})
export class UserDashboardComponent implements OnInit, OnDestroy {
  private dashService = inject(DashboardService);
  private auth        = inject(AuthService);
  private dutyService = inject(DutyService); // use DutyService for SSE — already connected
  private router      = inject(Router);

  stats   = signal<DashboardStats | null>(null);
  records = signal<DashboardRecord[]>([]);
  total   = signal(0);
  pages   = signal(0);
  loading = signal(false);
  modalOpen = signal(false);

  search      = signal('');
  status      = signal('');
  concernType = signal('');
  joStatus    = signal('');
  page        = signal(1);
  dateFrom    = signal('');
  dateTo      = signal('');

  dateRange = new FormGroup({
    start: new FormControl<Date | null>(null),
    end:   new FormControl<Date | null>(null),
  });

  readonly LIMIT = 25;
  private reloadTimeout: any = null;

  statusOptions = [
    { value: '',            label: 'All Statuses' },
    { value: 'pending',     label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'done',        label: 'Done' },
    { value: 'endorsed',    label: 'Endorsed' },
  ];

  concernOptions = [
    { value: '',         label: 'All Types' },
    { value: 'hardware', label: 'Hardware' },
    { value: 'network',  label: 'Network' },
    { value: 'system',   label: 'System' },
    { value: 'data',     label: 'Data' },
    { value: 'other',    label: 'Other' },
  ];

  joOptions = [
    { value: '',           label: 'All' },
    { value: 'with_jo',    label: 'With JO' },
    { value: 'without_jo', label: 'Without JO' },
  ];

  activeChips = computed(() => {
    const chips: { label: string; key: string }[] = [];
    if (this.status())      chips.push({ label: this.statusOptions.find(o => o.value === this.status())?.label ?? '', key: 'status' });
    if (this.concernType()) chips.push({ label: CONCERN_LABELS[this.concernType()] ?? '', key: 'concernType' });
    if (this.joStatus())    chips.push({ label: this.joOptions.find(o => o.value === this.joStatus())?.label ?? '', key: 'joStatus' });
    if (this.dateFrom() && this.dateTo()) chips.push({ label: `${this.dateFrom()} → ${this.dateTo()}`, key: 'date' });
    return chips;
  });

  currentUser = this.auth.currentUser;

  constructor() {
    // Watch DutyService.duties signal — whenever duties change, check if
    // any belong to the current user and reload dashboard
    effect(() => {
      const duties = this.dutyService.duties();
      const userId = this.auth.currentUser()?.id;
      if (!userId || duties.length === 0) return;
      const hasMyDuty = duties.some(d => Number(d.created_by) === Number(userId));
      if (hasMyDuty) this.debouncedReload();
    });
  }

  ngOnInit() {
    if (this.auth.isAdmin()) { this.router.navigate(['/admin']); return; }

    // Make sure DutyService is fetching (needed for SSE to be connected)
    if (this.dutyService.duties().length === 0) {
      this.dutyService.fetchAll().subscribe();
    }

    this.load();

    this.dateRange.valueChanges.subscribe(val => {
      if (val.start && val.end) {
        this.dateFrom.set(this.fmtDate(val.start));
        this.dateTo.set(this.fmtDate(val.end));
        this.page.set(1);
        this.load();
      }
    });
  }

  ngOnDestroy() {
    clearTimeout(this.reloadTimeout);
  }

  private debouncedReload() {
    clearTimeout(this.reloadTimeout);
    this.reloadTimeout = setTimeout(() => this.load(), 800);
  }

  private fmtDate(d: Date): string {
    const year  = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day   = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  load() {
    this.loading.set(true);
    const filter: DashboardFilter = { page: this.page(), limit: this.LIMIT };
    if (this.search())      filter.search      = this.search();
    if (this.status())      filter.status      = this.status();
    if (this.concernType()) filter.concernType = this.concernType();
    if (this.joStatus())    filter.joStatus    = this.joStatus();
    if (this.dateFrom())    filter.dateFrom    = this.dateFrom();
    if (this.dateTo())      filter.dateTo      = this.dateTo();

    this.dashService.getMyDashboard(filter).subscribe({
      next: res => {
        this.stats.set(res.stats);
        this.records.set(res.records);
        this.total.set(res.total);
        this.pages.set(res.pages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearch(val: string)  { this.search.set(val); this.page.set(1); this.load(); }

  setFilter(key: 'status' | 'concernType' | 'joStatus', val: string) {
    if (key === 'status')      this.status.set(val);
    if (key === 'concernType') this.concernType.set(val);
    if (key === 'joStatus')    this.joStatus.set(val);
    this.page.set(1); this.load();
  }

  removeChip(key: string) {
    if (key === 'status')      this.status.set('');
    if (key === 'concernType') this.concernType.set('');
    if (key === 'joStatus')    this.joStatus.set('');
    if (key === 'date')        { this.dateFrom.set(''); this.dateTo.set(''); this.dateRange.reset(); }
    this.page.set(1); this.load();
  }

  clearAll() {
    this.search.set(''); this.status.set(''); this.concernType.set('');
    this.joStatus.set(''); this.dateFrom.set(''); this.dateTo.set('');
    this.dateRange.reset(); this.page.set(1); this.load();
  }

  goTo(p: number) { if (p < 1 || p > this.pages()) return; this.page.set(p); this.load(); }

  get pageNumbers(): number[] {
    const range: number[] = [];
    for (let i = Math.max(1, this.page() - 2); i <= Math.min(this.pages(), this.page() + 2); i++) range.push(i);
    return range;
  }

  lastActivityLabel(r: DashboardRecord): string {
    if (!r.last_action) return '—';
    if (r.last_action === 'status_change') {
      return `${this.statusLabel(r.last_from ?? '')} → ${this.statusLabel(r.last_to ?? '')}`;
    }
    if (r.last_action === 'edit') return 'Details edited';
    return r.last_action;
  }

  private statusLabel(s: string): string {
    const map: Record<string, string> = {
      pending: 'Pending', in_progress: 'In Progress',
      done: 'Done', endorsed: 'Endorsed', failed: 'Failed',
    };
    return map[s] ?? s;
  }

  statusColor(s: string)  { return STATUS_COLORS[s] ?? '#6B7280'; }
  statusBg(s: string)     { return STATUS_BG[s]     ?? '#F3F4F6'; }
  concernLabel(c: string) { return CONCERN_LABELS[c] ?? 'Other'; }
  formattedId(id: number) { return '#' + String(id).padStart(4, '0'); }

  fmtDateTime(ts: string): string {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      + ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
}