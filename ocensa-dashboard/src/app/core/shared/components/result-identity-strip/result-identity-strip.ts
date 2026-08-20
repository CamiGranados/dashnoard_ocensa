import { Component, input } from '@angular/core';
import { ScientificResultIdentity } from '../../../models/scientific-chart.model';

@Component({
  selector: 'app-result-identity-strip',
  templateUrl: './result-identity-strip.html',
  styleUrl: './result-identity-strip.css',
})
export class ResultIdentityStrip {
  readonly identity = input.required<ScientificResultIdentity>();
}
