import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth';

export const adminGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  if (!authService.getToken()) {
    return router.createUrlTree(['/login']);
  }

  if (authService.isAdmin() && authService.currentUser()?.activo !== false) {
    return true;
  }

  return authService.verificarPerfilAdmin().pipe(
    map((esAdmin) => (esAdmin ? true : router.createUrlTree(['/feed']))),
  );
};