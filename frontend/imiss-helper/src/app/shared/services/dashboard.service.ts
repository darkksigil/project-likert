// src/app/shared/services/dashboard.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

export interface DashboardStats {
  total:       number;
  pending:     number;
  in_progress: number;
  done:        number;
  endorsed:    number;
  with_jo:     number;
  without_jo:  number;
}

export interface DashboardRecord {
  id:               number;
  status:           string;
  concern_type:     string;
  jo_number:        string | null;
  jo_verified:      boolean | null;
  created_at:       string;
  updated_at:       string;
  department:       string;
  concern:          string;
  requester_name:   string | null;
  // latest activity
  last_action:      string | null;
  last_from:        string | null;
  last_to:          string | null;
  last_actor:       string | null;
  last_activity_at: string | null;
}

export interface DashboardResponse {
  stats:   DashboardStats;
  records: DashboardRecord[];
  total:   number;
  page:    number;
  pages:   number;
}

export interface DashboardFilter {
  page:         number;
  limit:        number;
  search?:      string;
  status?:      string;
  concernType?: string;
  joStatus?:    string;
  dateFrom?:    string;
  dateTo?:      string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly API = 'http://localhost:3000/api';
  private http = inject(HttpClient);

  getMyDashboard(filter: DashboardFilter) {
    let params = new HttpParams()
      .set('page',  filter.page)
      .set('limit', filter.limit);

    if (filter.search)      params = params.set('search',      filter.search);
    if (filter.status)      params = params.set('status',      filter.status);
    if (filter.concernType) params = params.set('concernType', filter.concernType);
    if (filter.joStatus)    params = params.set('joStatus',    filter.joStatus);
    if (filter.dateFrom)    params = params.set('dateFrom',    filter.dateFrom);
    if (filter.dateTo)      params = params.set('dateTo',      filter.dateTo);

    return this.http.get<DashboardResponse>(`${this.API}/users/me/dashboard`, { params });
  }
}