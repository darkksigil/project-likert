// src/app/shared/services/jo.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface JOResult {
  found:           boolean;
  jo_number?:      string;
  department?:     string;
  nature_of_work?: string;
  computer_name?:  string;
  created_by?:     string;
  start?:          string;
  finish?:         string;
  error?:          string;
}

@Injectable({ providedIn: 'root' })
export class JoService {
  private readonly API = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  verify(joInput: string): Observable<JOResult> {
    return this.http.post<JOResult>(`${this.API}/jo/verify`, { joNumber: joInput });
  }
}