// src/app/board/board.component.ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../navbar/navbar.component';
import { AddDutyModalComponent } from '../add-duty-modal/add-duty-modal.component';
import { DutyService } from '../shared/services/duty.service';
import { DutyCardComponent } from '../duty-card/duty-card.component';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [CommonModule, NavbarComponent, AddDutyModalComponent, DutyCardComponent],
  templateUrl: './board.component.html',
})
export class BoardComponent implements OnInit {
  private dutyService = inject(DutyService);

  modalOpen  = signal(false);
  pending    = this.dutyService.pending;
  inProgress = this.dutyService.inProgress;
  done       = this.dutyService.done;
  loading    = this.dutyService.loading;
  skeletons  = [1, 2, 3];

  ngOnInit() { this.dutyService.fetchAll().subscribe(); }
}