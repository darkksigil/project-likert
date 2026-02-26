// src/app/login/login.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../shared/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private auth   = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  loading  = false;
  error    = '';

  submit() {
    if (!this.username.trim() || !this.password) {
      this.error = 'Please enter username and password.'; return;
    }
    this.loading = true;
    this.error   = '';
    this.auth.login(this.username.trim(), this.password).subscribe({
      next: (res) => {
        this.loading = false;
        this.router.navigate([res.user.role === 'admin' ? '/admin' : '/board']);
      },
      error: (err) => {
        this.loading = false;
        this.error   = err.error?.error || 'Login failed.';
      }
    });
  }
}