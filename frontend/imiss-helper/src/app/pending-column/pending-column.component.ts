import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DutyCardComponent } from '../duty-card/duty-card.component';
import { DutyService } from '../shared/services/duty.service';

@Component({
  selector: 'app-pending-column',
  standalone: true,
  imports: [CommonModule, DutyCardComponent],
  templateUrl: './pending-column.component.html',
})
export class PendingColumnComponent {
  private dutyService = inject(DutyService);

  duties  = computed(() => this.dutyService.pending());
  loading = computed(() => this.dutyService.loading());
  skeletons = [1, 2, 3];
}
