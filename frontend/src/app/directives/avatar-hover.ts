import { Directive, signal } from '@angular/core';

@Directive({
  selector: '[appAvatarHover]',
  host: {
    '[style.transition]': '"filter 0.2s ease"',
    '[style.filter]': 'hover() ? "contrast(0.78) brightness(1.25)" : "none"',
    '(mouseenter)': 'hover.set(true)',
    '(mouseleave)': 'hover.set(false)',
  },
})
export class AvatarHoverDirective {
  protected hover = signal(false);
}