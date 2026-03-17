// src/app/navbar/navbar.component.ts
import { Component, computed, inject, output, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../shared/services/auth.service';
import { DutyService } from '../shared/services/duty.service';
import { NotificationService } from '../shared/services/notification.service';
import { HttpClient } from '@angular/common/http';
import { BrowserNotificationService } from '../shared/services/browser-notification.service';
import { NotifFilterService } from '../shared/services/notif-filter.service';
import { ConcernType } from '../shared/models/index';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',

})
export class NavbarComponent {
  openModal = output<void>();

  private auth        = inject(AuthService);
  private dutyService = inject(DutyService);
  private router      = inject(Router);
  private notif       = inject(NotificationService);
  private http        = inject(HttpClient);
  private bnotif = inject(BrowserNotificationService);
  private notifFilter = inject(NotifFilterService)

  private readonly API = 'http://localhost:3000/api';

  concernTypeOptions = [
    { value: 'hardware', label: 'Hardware' },
    { value: 'network',  label: 'Network'  },
    { value: 'system',   label: 'System'   },
    { value: 'data',     label: 'Data'     },
    { value: 'other',    label: 'Other'    },
  ];

  currentUser      = computed(() => this.auth.currentUser());
  isAdmin          = computed(() => this.auth.isAdmin());
  isDuty           = computed(() => this.auth.isDuty());
  pendingCount     = computed(() => this.dutyService.pending().length);
  progressCount    = computed(() => this.dutyService.inProgress().length);
  doneCount        = computed(() => this.dutyService.done().length);
  endorsementCount = computed(() => this.dutyService.endorsementCount());

  // ── Dropdown ──
  dropdownOpen = signal(false);
  toggleDropdown() { this.dropdownOpen.update(v => !v); }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('.user-menu-wrap')) {
      this.dropdownOpen.set(false);
    }
  }

  // ── Profile modal ──
  profileOpen    = signal(false);
  profileSaving  = signal(false);
  profileError   = signal('');
  profileForm    = signal({ full_name: '', username: '', currentPassword: '', newPassword: '', confirmPassword: '' });
  browserNotifsEnabled = signal(false);
  notifPermission      = signal<NotificationPermission>('default');

  openProfile() {
    this.dropdownOpen.set(false);
    this.profileForm.set({
      full_name:       '',
      username:        this.currentUser()?.username ?? '',
      currentPassword: '',
      newPassword:     '',
      confirmPassword: '',
    });
    this.profileError.set('');
    this.profileOpen.set(true);
  }

  saveProfile() {
    const f = this.profileForm();
    if (f.newPassword && f.newPassword !== f.confirmPassword) {
      this.profileError.set('New passwords do not match.'); return;
    }
    if (f.newPassword && !f.currentPassword) {
      this.profileError.set('Enter your current password to change it.'); return;
    }
    this.profileSaving.set(true);
    this.profileError.set('');

    const payload: any = {};
    if (f.full_name.trim())  payload.full_name = f.full_name.trim();
    if (f.newPassword)       { payload.currentPassword = f.currentPassword; payload.newPassword = f.newPassword; }

    this.http.patch(`${this.API}/users/me`, payload).subscribe({
      next: (updated: any) => {
        this.profileSaving.set(false);
        this.profileOpen.set(false);
        const cur = this.currentUser();
        if (cur) this.auth.currentUser.set({ ...cur, username: updated.username ?? cur.username });
        this.notif.show('Profile updated', 'success');
      },
      error: (e) => {
        this.profileSaving.set(false);
        this.profileError.set(e.error?.error ?? 'Failed to update profile.');
      }
    });
  }                          // ← saveProfile ends HERE

  // Template-safe profile form setters
  setFullName(v: string)        { this.profileForm.update(f => ({ ...f, full_name: v })); }
  setCurrentPassword(v: string) { this.profileForm.update(f => ({ ...f, currentPassword: v })); }
  setNewPassword(v: string)     { this.profileForm.update(f => ({ ...f, newPassword: v })); }
  setConfirmPassword(v: string) { this.profileForm.update(f => ({ ...f, confirmPassword: v })); }

  // ── Settings ──
  settingsOpen   = signal(false);
  toastsEnabled  = signal(true);
  darkMode       = signal(false);

  openSettings() {
    this.dropdownOpen.set(false);
    this.toastsEnabled.set(localStorage.getItem('toasts_enabled') !== 'false');
    this.darkMode.set(document.documentElement.classList.contains('dark'));
    this.browserNotifsEnabled.set(this.bnotif.isEnabled);
    this.notifPermission.set(this.bnotif.permission);
    this.settingsOpen.set(true);
  }

  toggleToasts(val: boolean) {
    this.toastsEnabled.set(val);
    localStorage.setItem('toasts_enabled', String(val));
  }

  toggleDarkMode(val: boolean) {
    this.darkMode.set(val);
    document.documentElement.classList.toggle('dark', val);
    localStorage.setItem('dark_mode', String(val));
  }

  // ── Logout ──
  logout() {
    this.dropdownOpen.set(false);
    this.auth.logout();
    this.notif.show('You have logged out successfully', 'info');
    this.router.navigate(['/login']);
  }

  async toggleBrowserNotifs(val: boolean) {
    if (val) {
      const granted = await this.bnotif.requestPermission();
      this.browserNotifsEnabled.set(granted);
      this.notifPermission.set(this.bnotif.permission);
      if (granted) this.notif.show('Browser notifications enabled', 'success');
      else         this.notif.show('Permission denied by browser', 'warning');
    } else {
      this.bnotif.disable();
      this.browserNotifsEnabled.set(false);
    }
  }

  isNotifTypeEnabled(type: string): boolean {
  const types = this.notifFilter.enabledTypes();
  return types === 'all' || types.includes(type as ConcernType);
}
 
toggleNotifType(type: string, enabled: boolean) {
  const current = this.notifFilter.enabledTypes();
  const all = ['hardware', 'network', 'system', 'data', 'other'] as ConcernType[];
 
  let updated: ConcernType[];
    if (current === 'all') {
      updated = enabled ? all : all.filter(t => t !== type);
    } else {
      updated = enabled
        ? [...current, type as ConcernType]
        : current.filter(t => t !== type);
    }
  
    // if all selected, store as 'all'
    this.notifFilter.save(updated.length === all.length ? 'all' : updated);
  }
}