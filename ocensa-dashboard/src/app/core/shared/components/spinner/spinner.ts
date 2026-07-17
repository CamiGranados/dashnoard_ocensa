import { Component, Input} from '@angular/core';
import { LoadingState } from '../../../services/loading-state';
import { LottieComponent, AnimationOptions } from 'ngx-lottie';

@Component({
  selector: 'app-spinner',
  imports: [LottieComponent],
  templateUrl: './spinner.html',
  styleUrl: './spinner.css',
})
export class Spinner {
  @Input() size = '80px';

  options: AnimationOptions = {
    path: 'animations/spinner.json',
    loop: true,
    autoplay: true,
  };
}
