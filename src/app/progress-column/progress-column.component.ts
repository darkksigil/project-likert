import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DutyCardComponent } from '../duty-card/duty-card.component';
import { DutyService } from '../shared/services/duty.service';

@Component({
  selector: 'app-progress-column',
  standalone: true,
  imports: [CommonModule, DutyCardComponent],
  templateUrl: './progress-column.component.html',
})
export class ProgressColumnComponent {
  private dutyService = inject(DutyService);

  duties  = computed(() => this.dutyService.inProgress());
  loading = computed(() => this.dutyService.loading());
  skeletons = [1, 2];
}
