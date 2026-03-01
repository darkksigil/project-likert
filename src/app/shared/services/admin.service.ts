// src/app/shared/services/admin.service.ts
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { User, Department } from '../models/index';
import { DepartmentService } from './department.service';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly API = 'http://localhost:3000/api';

  users = signal<User[]>([]);

  // ✅ Delegate departments to DepartmentService so it's shared with modal

  constructor(
    private http: HttpClient,
    private deptService: DepartmentService
  ) {}

  // Expose departments signal directly from DepartmentService
  get departmentsSignal() { return this.deptService.departments; }

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

  // ── Departments (delegated to DepartmentService) ──
  fetchDepartments() { return this.deptService.fetchDepartments(); }

  createDepartment(data: { code: string; name: string; grp: string }) {
    return this.http.post<Department>(`${this.API}/departments`, data).pipe(
      tap(d => this.deptService.departments.update(list => [...list, d]))
    );
  }

  deleteDepartment(id: number) {
    return this.http.delete(`${this.API}/departments/${id}`).pipe(
      tap(() => this.deptService.departments.update(list => list.filter(d => d.id !== id)))
    );
  }
}