import { Component, ElementRef, computed, inject, input, output, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { AvatarHoverDirective } from '../../directives/avatar-hover';

@Component({
  selector: 'app-header',
  imports: [RouterLink, AvatarHoverDirective],
  templateUrl: './header.html',
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class AppHeader {
  private authService = inject(AuthService);
  private router = inject(Router);
  private hostElement = inject(ElementRef<HTMLElement>);

  mostrarPublicar = input<boolean>(false);
  mostrarDashboard = input<boolean>(true);

  publicarClick = output<void>();
  logoClickEnFeed = output<void>();

  usuarioActual = computed(() => this.authService.currentUser());
  esAdmin = this.authService.isAdmin;
  menuUsuarioAbierto = signal<boolean>(false);

  mostrarVolverFeed = input<boolean>(false);

  avatarUsuarioActual = computed(() => {
    const user = this.usuarioActual();
    if (user?.imagenUrl) return user.imagenUrl;
    const nombre = user?.username || user?.nombre || 'U';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=4f46e5&color=fff`;
  });

  onLogoClick(event: Event): void {
    this.cerrarMenuUsuario();

    if (this.router.url.startsWith('/feed')) {
      event.preventDefault();
      this.logoClickEnFeed.emit();
    }
  }

  toggleMenuUsuario(event: Event): void {
    event.stopPropagation();
    this.menuUsuarioAbierto.update((abierto) => !abierto);
  }

  cerrarMenuUsuario(): void {
    if (this.menuUsuarioAbierto()) {
      this.menuUsuarioAbierto.set(false);
    }
  }

  onDocumentClick(event: MouseEvent): void {
    if (
      this.menuUsuarioAbierto() &&
      !this.hostElement.nativeElement.contains(event.target as Node)
    ) {
      this.menuUsuarioAbierto.set(false);
    }
  }

  cerrarSesion(): void {
    this.menuUsuarioAbierto.set(false);
    this.authService.logout('manual');
  }
}