// src/app/navbar/navbar.component.ts
import { Component, computed, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../shared/services/auth.service';
import { DutyService } from '../shared/services/duty.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  openModal = output<void>();

  private auth        = inject(AuthService);
  private dutyService = inject(DutyService);
  private router      = inject(Router);

  currentUser   = computed(() => this.auth.currentUser());
  isAdmin       = computed(() => this.auth.isAdmin());
  pendingCount  = computed(() => this.dutyService.pending().length);
  progressCount = computed(() => this.dutyService.inProgress().length);
  doneCount     = computed(() => this.dutyService.done().length);
  refreshing    = false;

  refresh() {
    this.refreshing = true;
    this.dutyService.fetchAll().subscribe({
      next:  () => this.refreshing = false,
      error: () => this.refreshing = false,
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}