import { Component, Input} from '@angular/core';
import spinnerData from '../../../../../../public/animations/spinner-fixed.json';

@Component({
  selector: 'app-spinner',
  imports: [],
  templateUrl: './spinner.html',
  styleUrl: './spinner.css',
})
export class Spinner {
  @Input() size = '80px';
}
