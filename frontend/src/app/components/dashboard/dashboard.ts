import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private authService = inject(AuthService);

  menuUsuarioAbierto = signal<boolean>(false);
  usuarioActual = computed(() => this.authService.currentUser());

  avatarUsuarioActual = computed(() => {
    const user = this.usuarioActual();
    if (user?.imagenUrl) return user.imagenUrl;
    const nombre = user?.username || user?.nombre || 'A';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=334155&color=fff`;
  });

  toggleMenuUsuario(event: Event): void {
    event.stopPropagation();
    this.menuUsuarioAbierto.update((abierto) => !abierto);
  }

  cerrarMenuUsuario(): void {
    if (this.menuUsuarioAbierto()) {
      this.menuUsuarioAbierto.set(false);
    }
  }

  cerrarSesion(): void {
    this.cerrarMenuUsuario();
    this.authService.logout();
  }
}