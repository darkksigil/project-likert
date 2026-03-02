// src/app/shared/services/department.service.ts
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { Department } from '../models/index';

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  private readonly API = 'http://localhost:3000/api';
  departments = signal<Department[]>([]);
  loadError   = signal('');

  constructor(private http: HttpClient) {}

  fetchDepartments() {
    return this.http.get<Department[]>(`${this.API}/departments`).pipe(
      tap(d => { this.departments.set(d); this.loadError.set(''); }),
      catchError(err => {
        console.error('fetchDepartments failed:', err.status, err.message);
        this.loadError.set(`Failed to load departments (${err.status})`);
        return of([]);
      })
    );
  }
}