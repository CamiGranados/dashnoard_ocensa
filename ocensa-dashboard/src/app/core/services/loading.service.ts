// src/app/core/loading.service.ts
import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private count = signal(0);

  private visible = signal(false);

  private timer: ReturnType<typeof setTimeout> | null = null;

  readonly isLoading = computed(() => this.visible());

  show() {
    this.count.update(n => n + 1);
    if (this.count() === 1) {
      this.timer = setTimeout(() => this.visible.set(true), 300);
    }
  }

  hide() {
    this.count.update(n => Math.max(0, n - 1));
    if (this.count() === 0) {
      if (this.timer) clearTimeout(this.timer);
      this.timer = null;
      this.visible.set(false);
    }
  }
}