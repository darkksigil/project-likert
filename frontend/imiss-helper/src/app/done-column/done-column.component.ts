import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DutyCardComponent } from '../duty-card/duty-card.component';
import { DutyService } from '../shared/services/duty.service';

@Component({
  selector: 'app-done-column',
  standalone: true,
  imports: [CommonModule, DutyCardComponent],
  templateUrl: './done-column.component.html',
})
export class DoneColumnComponent {
  private dutyService = inject(DutyService);

  duties  = computed(() => this.dutyService.done());
  loading = computed(() => this.dutyService.loading());
  skeletons = [1];
}
