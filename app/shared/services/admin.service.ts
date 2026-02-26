// src/app/shared/services/admin.service.ts
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { User, Department } from '../models/index';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly API = 'http://localhost:3000/api';

  users       = signal<User[]>([]);
  departments = signal<Department[]>([]);

  constructor(private http: HttpClient) {}

  // ── Users ──
  fetchUsers() {
    return this.http.get<User[]>(`${this.API}/users`).pipe(
      tap(u => this.users.set(u))
    );
  }

  createUser(data: { username: string; password: string; full_name: string; role: string }) {
    return this.http.post<User>(`${this.API}/users`, data).pipe(
      tap(u => this.users.update(list => [u, ...list]))
    );
  }

  updateUser(id: number, data: Partial<{ full_name: string; role: string; is_active: boolean; password: string }>) {
    return this.http.patch<User>(`${this.API}/users/${id}`, data).pipe(
      tap(updated => this.users.update(list => list.map(u => u.id === id ? updated : u)))
    );
  }

  deleteUser(id: number) {
    return this.http.delete(`${this.API}/users/${id}`).pipe(
      tap(() => this.users.update(list => list.filter(u => u.id !== id)))
    );
  }

  // ── Departments ──
  fetchDepartments() {
    return this.http.get<Department[]>(`${this.API}/departments`).pipe(
      tap(d => this.departments.set(d))
    );
  }

  createDepartment(data: { code: string; name: string; grp: string }) {
    return this.http.post<Department>(`${this.API}/departments`, data).pipe(
      tap(d => this.departments.update(list => [...list, d]))
    );
  }

  deleteDepartment(id: number) {
    return this.http.delete(`${this.API}/departments/${id}`).pipe(
      tap(() => this.departments.update(list => list.filter(d => d.id !== id)))
    );
  }
}