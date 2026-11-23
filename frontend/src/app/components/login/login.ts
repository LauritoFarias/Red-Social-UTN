import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth';
import { ToastService } from '../../services/toast';
import { getHttpErrorMessage } from '../../utils/http-error';

const noWhitespaceValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  if (typeof control.value === 'string' && control.value.length > 0 && control.value.trim().length === 0) {
    return { required: true };
  }
  return null;
};

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  private readonly DEMO_USER = {
    username: 'Reyes68',
    password: 'RitaReyes.68',
  };

  private readonly DEMO_ADMIN = {
    username: 'Lauro',
    password: 'Contraseñasegura.123',
  };

  loginForm = this.fb.group({
    username: ['', [Validators.required, noWhitespaceValidator]],
    password: ['', [Validators.required]],
  });

  showPassword = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');

  constructor() {
    this.loginForm.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        if (this.errorMessage()) {
          this.errorMessage.set('');
        }
      });
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  quickLogin(rol: 'usuario' | 'administrador'): void {
    const credenciales = rol === 'administrador' ? this.DEMO_ADMIN : this.DEMO_USER;

    this.loginForm.patchValue({
      username: credenciales.username,
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

    const { username, password } = this.loginForm.getRawValue();

    this.authService
      .login({
        username: (username ?? '').trim(),
        password: password ?? '',
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.toastService.show('Iniciaste sesión exitosamente', 'success');
          this.router.navigate(['/feed']);
        },
        error: (err: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(
            getHttpErrorMessage(err, 'No se pudo iniciar sesión. Intentá nuevamente.'),
          );
        },
      });
  }
}