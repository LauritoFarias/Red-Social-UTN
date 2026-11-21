import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'estadoUsuario',
})
export class EstadoUsuarioPipe implements PipeTransform {
  transform(activo: boolean | null | undefined): string {
    return activo === false ? 'Deshabilitado' : 'Habilitado';
  }
}