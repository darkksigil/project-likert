import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../shared/services/admin.service';
import { DutyService } from '../../shared/services/duty.service';
import { AuthService } from '../../shared/services/auth.service';
import { ROLE_LABELS, User, Department } from '../../shared/models/index';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit {
  private adminService = inject(AdminService);
  private dutyService  = inject(DutyService);
  private auth         = inject(AuthService);

  activeTab   = signal<'overview' | 'users' | 'departments'>('overview');
  roleLabels  = ROLE_LABELS;
  roles       = ['administrative','hardware','system','data','cybersecurity'] as const;

  users       = this.adminService.users;
  departments = this.adminService.departments;
  duties      = this.dutyService.duties;
  currentUser = this.auth.currentUser;

  showUserForm  = false;
  editingUser: User | null = null;
  userForm = { username: '', password: '', full_name: '', role: 'hardware' };
  userError = '';
  userLoading = false;

  showDeptForm = false;
  deptForm = { code: '', name: '', grp: '' };
  deptError = '';
  deptLoading = false;

  ngOnInit() {
    this.adminService.fetchUsers().subscribe();
    this.adminService.fetchDepartments().subscribe();
    this.dutyService.fetchAll().subscribe();
  }

  get totalDuties()    { return this.duties().length; }
  get pendingDuties()  { return this.dutyService.pending().length; }
  get activeDuties()   { return this.dutyService.inProgress().length; }
  get doneDuties()     { return this.dutyService.done().length; }
  get activeUsers()    { return this.users().filter(u => u.is_active).length; }
  get totalDepts()     { return this.departments().length; }

  openCreateUser() {
    this.editingUser = null;
    this.userForm    = { username: '', password: '', full_name: '', role: 'hardware' };
    this.userError   = '';
    this.showUserForm = true;
  }

  openEditUser(user: User) {
    this.editingUser = user;
    this.userForm    = { username: user.username, password: '', full_name: user.full_name, role: user.role };
    this.userError   = '';
    this.showUserForm = true;
  }

  saveUser() {
    if (!this.userForm.full_name || !this.userForm.role) { this.userError = 'Fill in all required fields.'; return; }
    if (!this.editingUser && (!this.userForm.username || !this.userForm.password)) {
      this.userError = 'Username and password required.'; return;
    }
    this.userLoading = true;
    const obs = this.editingUser
      ? this.adminService.updateUser(this.editingUser.id, {
          full_name: this.userForm.full_name, role: this.userForm.role,
          ...(this.userForm.password ? { password: this.userForm.password } : {})
        })
      : this.adminService.createUser(this.userForm);

    obs.subscribe({
      next:  () => { this.userLoading = false; this.showUserForm = false; },
      error: (e) => { this.userLoading = false; this.userError = e.error?.error || 'Failed.'; }
    });
  }

  toggleUser(user: User) {
    this.adminService.updateUser(user.id, { is_active: !user.is_active }).subscribe();
  }

  deleteUser(user: User) {
    if (!confirm(`Delete user "${user.username}"?`)) return;
    this.adminService.deleteUser(user.id).subscribe();
  }

  openCreateDept() {
    this.deptForm    = { code: '', name: '', grp: '' };
    this.deptError   = '';
    this.showDeptForm = true;
  }

  saveDept() {
    if (!this.deptForm.code || !this.deptForm.name) { this.deptError = 'Code and name required.'; return; }
    this.deptLoading = true;
    this.adminService.createDepartment(this.deptForm).subscribe({
      next:  () => { this.deptLoading = false; this.showDeptForm = false; },
      error: (e) => { this.deptLoading = false; this.deptError = e.error?.error || 'Failed.'; }
    });
  }

  deleteDept(dept: Department) {
    if (!confirm(`Delete department "${dept.name}"?`)) return;
    this.adminService.deleteDepartment(dept.id).subscribe();
  }
}