// src/app/shared/services/auth.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { AuthUser, PRIVILEGED_ROLES, DASHBOARD_ROLES, AUTO_PROGRESS_ROLES } from '../models/index';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = 'http://localhost:3000/api';
  private readonly TOKEN_KEY = 'duty_token';

  currentUser = signal<AuthUser | null>(null);
  isLoggedIn  = computed(() => !!this.currentUser());

  // Role checks
  isAdmin          = computed(() => this.currentUser()?.role === 'admin');
  isDuty           = computed(() => this.currentUser()?.role === 'duty');
  isPrivileged    = computed(() => (PRIVILEGED_ROLES as string[]).includes(this.currentUser()?.role ?? ''));
  hasDashboard    = computed(() => (DASHBOARD_ROLES as string[]).includes(this.currentUser()?.role ?? ''));
  canAutoProgress = computed(() => (AUTO_PROGRESS_ROLES as string[]).includes(this.currentUser()?.role ?? ''));

  constructor(private http: HttpClient) {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (token) {
      const payload = this.parseToken(token);
      if (payload) this.currentUser.set(payload);
    }
  }

  login(username: string, password: string) {
    return this.http.post<{ token: string; user: AuthUser }>(
      `${this.API}/auth/login`, { username, password }
    ).pipe(
      tap(res => {
        localStorage.setItem(this.TOKEN_KEY, res.token);
        this.currentUser.set(res.user);
      })
    );
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    this.currentUser.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private parseToken(token: string): AuthUser | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        localStorage.removeItem(this.TOKEN_KEY);
        return null;
      }
      return { id: payload.id, username: payload.username, role: payload.role };
    } catch { return null; }
  }
}