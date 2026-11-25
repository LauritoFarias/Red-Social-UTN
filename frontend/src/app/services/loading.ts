import { Injectable, signal } from '@angular/core';
import { Observable, finalize } from 'rxjs';

export const SPINNER_MIN_MS = 1000;

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private activeRequests = 0;
  private shownAt = 0;
  private hideTimeoutId: ReturnType<typeof setTimeout> | null = null;

  readonly isLoading = signal(false);

  show(): void {
    if (this.hideTimeoutId) {
      clearTimeout(this.hideTimeoutId);
      this.hideTimeoutId = null;
    }

    if (this.activeRequests === 0) {
      this.shownAt = Date.now();
      this.isLoading.set(true);
    }

    this.activeRequests++;
  }

  hide(minMs = SPINNER_MIN_MS): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    if (this.activeRequests > 0) return;

    const elapsed = Date.now() - this.shownAt;
    const remaining = Math.max(0, minMs - elapsed);

    if (remaining === 0) {
      this.isLoading.set(false);
    } else {
      this.hideTimeoutId = setTimeout(() => {
        this.isLoading.set(false);
        this.hideTimeoutId = null;
      }, remaining);
    }
  }

  track<T>(obs$: Observable<T>, minMs = SPINNER_MIN_MS): Observable<T> {
    this.show();
    return obs$.pipe(finalize(() => this.hide(minMs)));
  }
}