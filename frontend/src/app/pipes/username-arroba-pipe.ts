import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'usernameArroba',
})
export class UsernameArrobaPipe implements PipeTransform {
  transform(username: string | null | undefined): string {
    if (!username) return '';
    const limpio = username.trim();
    return limpio.startsWith('@') ? limpio : `@${limpio}`;
  }
}