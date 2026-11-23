import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, map, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { ToastService } from './toast';

export const TIEMPO_AVISO_MS = 60 * 1000;
export const TIEMPO_GRACIA_SEGUNDOS = 30;

export interface UsuarioSesion {
  _id: string;
  nombre: string;
  apellido: string;
  correo: string;
  username: string;
  imagenUrl?: string;
  fotoPerfil?: string;
  descripcion: string;
  fechaNacimiento?: string;
  perfil: string;
  activo?: boolean;
  createdAt?: string;
}

export interface LoginResponse {
  access_token: string;
  usuario: UsuarioSesion;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private apiUrl = `${environment.apiUrl}/auth`;

  private warningTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private countdownIntervalId: ReturnType<typeof setInterval> | null = null;
  private expiracionTimestamp: number | null = null;

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  currentUser = signal<UsuarioSesion | null>(this.obtenerUsuarioGuardado());
  currentUserId = computed(() => this.currentUser()?._id ?? '');
  isAuthenticated = computed(() => !!this.currentUser() && !!this.getToken());

  readonly isAdmin = computed(() => this.currentUser()?.perfil === 'administrador');

  mostrarModalExpiracion = signal<boolean>(false);
  segundosRestantes = signal<number>(TIEMPO_GRACIA_SEGUNDOS);
  refrescandoToken = signal<boolean>(false);

  private toastService = inject(ToastService);

  constructor() {
    if (this.isBrowser) {
      // Al volver a la pestaña o ventana, sincroniza de inmediato contra Date.now()
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.actualizarEstadoSesion();
        }
      });

      window.addEventListener('focus', () => {
        this.actualizarEstadoSesion();
      });

      // Si ya había un token guardado al recargar la página (F5), retoma el temporizador real
      if (this.getToken()) {
        this.iniciarTemporizadorSesion();
      }
    }
  }

  registrar(formData: FormData): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/registro`, formData).pipe(
      tap((res) => this.guardarSesion(res)),
    );
  }

  registrarComoAdmin(formData: FormData): Observable<LoginResponse> {
    const token = this.getToken();
    const headers = token
      ? new HttpHeaders().set('Authorization', `Bearer ${token}`)
      : new HttpHeaders();

    return this.http.post<LoginResponse>(`${this.apiUrl}/registro`, formData, { headers });
  }

  login(credenciales: { username: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credenciales).pipe(
      tap((res) => this.guardarSesion(res)),
    );
  }

  extenderSesion(): void {
    if (!this.isBrowser || this.refrescandoToken()) return;

    const token = this.getToken();
    if (!token || (this.expiracionTimestamp && Date.now() >= this.expiracionTimestamp)) {
      this.logout();
      return;
    }

    this.refrescandoToken.set(true);
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.post<LoginResponse>(`${this.apiUrl}/refresh`, {}, { headers }).subscribe({
      next: (res) => {
        this.refrescandoToken.set(false);
        this.guardarSesion(res);
      },
      error: () => {
        this.refrescandoToken.set(false);
        this.logout();
      },
    });
  }

  logout(motivo: 'manual' | 'expirada' = 'manual'): void {
    this.detenerTemporizadores();
    this.limpiarSesion();

    if (motivo === 'manual') {
      this.toastService.show('Sesión cerrada exitosamente', 'success');
    } else {
      this.toastService.show('Tu sesión expiró. Volvé a iniciar sesión.', 'info');
    }

    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem('token');
  }

  verificarSesion(): Observable<boolean> {
    if (!this.isBrowser) {
      return of(false);
    }

    const token = this.getToken();
    if (!token) {
      this.limpiarSesion();
      return of(false);
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http
      .get<{ valido: boolean; usuario: UsuarioSesion }>(`${this.apiUrl}/me`, { headers })
      .pipe(
        tap((res) => {
          if (res.usuario) {
            if (res.usuario.activo === false) {
              this.limpiarSesion();
              return;
            }
            this.currentUser.set(res.usuario);
            localStorage.setItem('usuario', JSON.stringify(res.usuario));

            if (!this.expiracionTimestamp) {
              this.iniciarTemporizadorSesion();
            }
          }
        }),
        map((res) => res.valido && res.usuario?.activo !== false),
        catchError(() => {
          this.limpiarSesion();
          return of(false);
        }),
      );
  }

  verificarPerfilAdmin(): Observable<boolean> {
    if (!this.isBrowser) {
      return of(true);
    }

    if (this.isAdmin() && this.currentUser()?.activo !== false && !!this.getToken()) {
      return of(true);
    }

    return this.verificarSesion().pipe(
      map((sesionValida) => sesionValida && this.isAdmin()),
    );
  }

  iniciarTemporizadorSesion(): void {
    if (!this.isBrowser) return;
    this.detenerTemporizadores();

    this.expiracionTimestamp = this.obtenerExpiracionToken(this.getToken());
    this.actualizarEstadoSesion();
  }

  /**
   * Evalúa el estado real de la sesión comparando contra Date.now().
   * Funciona de forma exacta incluso si el navegador pausó los timers en segundo plano.
   */
  private actualizarEstadoSesion(): void {
    if (!this.isBrowser || !this.expiracionTimestamp) return;

    const restanteMs = this.expiracionTimestamp - Date.now();

    if (restanteMs <= 0) {
      this.logout();
      return;
    }

    const graciaMs = TIEMPO_GRACIA_SEGUNDOS * 1000;

    if (restanteMs <= graciaMs) {
      if (this.warningTimeoutId) {
        clearTimeout(this.warningTimeoutId);
        this.warningTimeoutId = null;
      }

      this.segundosRestantes.set(Math.ceil(restanteMs / 1000));
      this.mostrarModalExpiracion.set(true);

      if (!this.countdownIntervalId) {
        // 500ms evita saltos visuales si un tick se retrasa unos milisegundos
        this.countdownIntervalId = setInterval(() => {
          this.actualizarEstadoSesion();
        }, 500);
      }
    } else {
      this.mostrarModalExpiracion.set(false);

      if (this.countdownIntervalId) {
        clearInterval(this.countdownIntervalId);
        this.countdownIntervalId = null;
      }

      if (this.warningTimeoutId) {
        clearTimeout(this.warningTimeoutId);
      }

      const tiempoHastaAviso = restanteMs - graciaMs;
      this.warningTimeoutId = setTimeout(() => {
        this.actualizarEstadoSesion();
      }, tiempoHastaAviso);
    }
  }

  /**
   * Extrae la fecha exacta de expiración (claim "exp") del JWT.
   * Si el token no tiene "exp", usa el tiempo configurado por constantes.
   */
  private obtenerExpiracionToken(token: string | null): number {
    const fallback = Date.now() + TIEMPO_AVISO_MS + TIEMPO_GRACIA_SEGUNDOS * 1000;
    if (!token) return fallback;

    try {
      const payloadBase64 = token.split('.')[1];
      if (!payloadBase64) return fallback;

      const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));

      if (typeof payload.exp === 'number') {
        return payload.exp * 1000;
      }
    } catch {
      // Respaldo si el token no es un JWT estándar
    }

    return fallback;
  }

  private detenerTemporizadores(): void {
    if (this.warningTimeoutId) {
      clearTimeout(this.warningTimeoutId);
      this.warningTimeoutId = null;
    }
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
    this.expiracionTimestamp = null;
    this.mostrarModalExpiracion.set(false);
  }

  private guardarSesion(res: LoginResponse): void {
    if (this.isBrowser) {
      localStorage.setItem('token', res.access_token);
      localStorage.setItem('usuario', JSON.stringify(res.usuario));
    }
    this.currentUser.set(res.usuario);
    this.iniciarTemporizadorSesion();
  }

  private limpiarSesion(): void {
    if (this.isBrowser) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
    }
    this.currentUser.set(null);
  }

  private obtenerUsuarioGuardado(): UsuarioSesion | null {
    if (!isPlatformBrowser(this.platformId)) return null;

    const raw = localStorage.getItem('usuario');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UsuarioSesion;
    } catch {
      return null;
    }
  }

  actualizarPerfil(formData: FormData): Observable<{ usuario: UsuarioSesion }> {
    const token = this.getToken();
    const headers = token
      ? new HttpHeaders().set('Authorization', `Bearer ${token}`)
      : new HttpHeaders();

    return this.http
      .patch<{ usuario: UsuarioSesion }>(`${this.apiUrl}/perfil`, formData, { headers })
      .pipe(
        tap((res) => {
          if (res.usuario) {
            this.currentUser.set(res.usuario);
            if (this.isBrowser) {
              localStorage.setItem('usuario', JSON.stringify(res.usuario));
            }
          }
        }),
      );
  }
}