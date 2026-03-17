// src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { authInterceptor } from './shared/services/auth.interceptor';
import { authGuard, adminGuard, nonAdminGuard } from './shared/guards/auth.guard';
import { LoginComponent } from './login/login.component';
import { BoardComponent } from './board/board.component';
import { AdminDashboardComponent } from './admin/dashboard/admin-dashboard.component';
import { UserDashboardComponent } from './user-dashboard/user-dashboard.component';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter([
      { path: '',          redirectTo: 'login', pathMatch: 'full' },
      { path: 'login',     component: LoginComponent },
      { path: 'board',     component: BoardComponent,          canActivate: [authGuard] },
      { path: 'admin',     component: AdminDashboardComponent, canActivate: [authGuard, adminGuard] },
      { path: 'dashboard', component: UserDashboardComponent,  canActivate: [authGuard, nonAdminGuard] },
      { path: '**',        redirectTo: 'login' },
    ]),
  ]
};