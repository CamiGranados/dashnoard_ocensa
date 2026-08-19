import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { MicrobiologyService } from '../../../../core/services/microbiology.service';

@Component({
  selector: 'app-microbiology',
  imports: [CommonModule, TableModule],
  templateUrl: './microbiology.html',
  styleUrl: './microbiology.css',
})
export class Microbiology {
  private readonly microbiologyService = inject(MicrobiologyService);

  readonly review = this.microbiologyService.review;

  readonly records = computed(() => this.review.value()?.data ?? []);
  readonly totalRecords = computed(() => this.records().length);


}
