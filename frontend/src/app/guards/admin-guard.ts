import { CanActivateFn, Router } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth';
import { environment } from '../../environments/environment';

export const adminGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  const authService = inject(AuthService);
  const router = inject(Router);
  const http = inject(HttpClient);

  // Evitamos falsos redireccionamientos durante el pre-renderizado / SSR
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const user = authService.currentUser();
  if (user) {
    return user.perfil === 'administrador'
      ? true
      : router.createUrlTree(['/feed']);
  }

  const token = localStorage.getItem('token');
  if (!token) {
    return router.createUrlTree(['/login']);
  }

  return http.get<{ perfil?: string }>(`${environment.apiUrl}/usuarios/me`).pipe(
    map((usuario) => {
      if (usuario && usuario.perfil === 'administrador') {
        return true;
      }
      return router.createUrlTree(['/feed']);
    }),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};