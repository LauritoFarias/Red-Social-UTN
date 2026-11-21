import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { EstadoUsuarioPipe } from '../../../pipes/estado-usuario-pipe';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../services/auth';
import { Registro } from '../../registro/registro';
import { environment } from '../../../../environments/environment';

export interface UsuarioDashboard {
  _id: string;
  nombre: string;
  apellido: string;
  correo: string;
  username: string;
  fechaNacimiento: string;
  imagenUrl?: string;
  perfil: 'usuario' | 'administrador';
  activo?: boolean;
  createdAt?: string;
}

@Component({
  selector: 'app-usuarios',
  imports: [DatePipe, EstadoUsuarioPipe, Registro],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.scss',
})
export class DashboardUsuarios implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private apiUrl = `${environment.apiUrl}/usuarios`;

  usuarios = signal<UsuarioDashboard[]>([]);
  cargando = signal<boolean>(true);
  error = signal<string>('');
  procesandoId = signal<string | null>(null);

  modalRegistroAbierto = signal<boolean>(false);
  toastMensaje = signal<string>('');

  currentUserId = computed(() => this.authService.currentUserId());

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.cargarUsuarios();
    }
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return token
      ? new HttpHeaders().set('Authorization', `Bearer ${token}`)
      : new HttpHeaders();
  }

  cargarUsuarios(): void {
    this.cargando.set(true);
    this.error.set('');

    this.http
      .get<UsuarioDashboard[]>(this.apiUrl, { headers: this.getAuthHeaders() })
      .subscribe({
        next: (lista) => {
          this.usuarios.set(lista);
          this.cargando.set(false);
        },
        error: (err) => {
          console.error('Error al cargar usuarios:', err);
          this.error.set(err?.error?.message || 'No se pudo cargar el listado de usuarios.');
          this.cargando.set(false);
        },
      });
  }

  toggleEstadoUsuario(usuario: UsuarioDashboard): void {
    if (usuario._id === this.currentUserId()) return;

    const estaActivo = usuario.activo !== false;
    this.procesandoId.set(usuario._id);
    this.error.set('');

    const headers = this.getAuthHeaders();
    const request$ = estaActivo
      ? this.http.delete<UsuarioDashboard>(`${this.apiUrl}/${usuario._id}`, { headers })
      : this.http.patch<UsuarioDashboard>(`${this.apiUrl}/${usuario._id}/alta`, {}, { headers });

    request$.subscribe({
      next: (actualizado) => {
        this.usuarios.update((lista) =>
          lista.map((u) =>
            u._id === usuario._id ? { ...u, activo: actualizado.activo } : u,
          ),
        );
        this.procesandoId.set(null);
        this.mostrarToast(
          actualizado.activo === false
            ? `Usuario ${usuario.username} dado de baja (deshabilitado).`
            : `Usuario ${usuario.username} dado de alta nuevamente.`,
        );
      },
      error: (err) => {
        this.procesandoId.set(null);
        this.error.set(err?.error?.message || 'No se pudo actualizar el estado del usuario.');
      },
    });
  }

  abrirModalCrearUsuario(): void {
    this.modalRegistroAbierto.set(true);
  }

  cerrarModalCrearUsuario(): void {
    this.modalRegistroAbierto.set(false);
  }

  onUsuarioCreado(): void {
    this.cerrarModalCrearUsuario();
    this.cargarUsuarios();
    this.mostrarToast('Nuevo usuario creado correctamente.');
  }

  private mostrarToast(mensaje: string): void {
    this.toastMensaje.set(mensaje);
    setTimeout(() => this.toastMensaje.set(''), 3500);
  }
}