import { Directive, computed, input } from '@angular/core';

@Directive({
  selector: '[appEstadoUsuario]',
  host: {
    '[style.backgroundColor]': 'estaActivo() ? "rgba(34, 197, 94, 0.16)" : "rgba(239, 68, 68, 0.16)"',
    '[style.color]': 'estaActivo() ? "#4ade80" : "#f87171"',
    '[style.border]': 'estaActivo() ? "1px solid rgba(34, 197, 94, 0.45)" : "1px solid rgba(239, 68, 68, 0.45)"',
    '[style.display]': '"inline-block"',
    '[style.padding]': '"4px 10px"',
    '[style.borderRadius]': '"9999px"',
    '[style.fontWeight]': '"600"',
  },
})
export class EstadoUsuarioDirective {
  activo = input<boolean | undefined>(true, { alias: 'appEstadoUsuario' });
  protected estaActivo = computed(() => this.activo() !== false);
}