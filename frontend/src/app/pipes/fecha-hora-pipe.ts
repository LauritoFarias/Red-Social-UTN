import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fechaHora',
})
export class FechaHoraPipe implements PipeTransform {
  transform(valor: Date | string | null | undefined): string {
    if (!valor) return '';

    const fecha = valor instanceof Date ? valor : new Date(valor);
    if (isNaN(fecha.getTime())) return '';

    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = fecha.getFullYear();

    const horasNum = fecha.getHours();
    const horas = String(horasNum).padStart(2, '0');
    const minutos = String(fecha.getMinutes()).padStart(2, '0');

    const conector = horasNum === 1 ? 'a la' : 'a las';

    return `${dia}/${mes}/${anio} ${conector} ${horas}:${minutos}`;
  }
}