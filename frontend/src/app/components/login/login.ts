import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  private readonly DEMO_USER = {
    identificador: 'ritareyes@hotmail.com', // TODO: completar con correo o username del usuario demo
    password: 'RitaReyes.68',      // TODO: completar con contraseña del usuario demo
  };

  private readonly DEMO_ADMIN = {
    identificador: 'ivanlaurito@hotmail.com',
    password: 'Contraseñasegura.123',
  };

  loginForm = this.fb.group({
    identificador: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  showPassword = signal(false);

  isSubmitting = signal(false);
  errorMessage = signal('');

  togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  quickLogin(rol: 'usuario' | 'administrador'): void {
    const credenciales = rol === 'administrador' ? this.DEMO_ADMIN : this.DEMO_USER;

    this.loginForm.patchValue({
      identificador: credenciales.identificador,
      password: credenciales.password,
    });
    this.onSubmit();
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const { identificador, password } = this.loginForm.getRawValue();

    this.authService
      .login({
        identificador: identificador ?? '',
        password: password ?? '',
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.router.navigate(['/feed']);
        },
        error: (err: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          if (err.error?.message) {
            const msg = Array.isArray(err.error.message)
              ? err.error.message[0]
              : err.error.message;
            this.errorMessage.set(msg);
          } else {
            this.errorMessage.set('Error al iniciar sesión. Verificá tus datos.');
          }
        },
      });
  }
}