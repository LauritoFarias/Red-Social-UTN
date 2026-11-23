import { Component, OnDestroy, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';
import { AuthService, UsuarioSesion } from '../../services/auth';
import { PostsService } from '../../services/posts';
import { EstadisticasService } from '../../services/estadisticas';
import { ToastService } from '../../services/toast';
import { PostItem } from '../../models/post.model';
import { AppHeader } from '../header/header';
import { PostCard } from '../post-card/post-card';
import { UsernameArrobaPipe } from '../../pipes/username-arroba-pipe';
import { getHttpErrorMessage } from '../../utils/http-error';

export type CampoEditable =
  | 'nombre'
  | 'apellido'
  | 'username'
  | 'descripcion'
  | 'fechaNacimiento'
  | 'imagen'
  | 'password';

const passwordMatchValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  if (!password || !confirmPassword) return null;
  return password === confirmPassword ? null : { passwordMismatch: true };
};

const futureDateValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value = control.value;
  if (!value) return null;
  const today = new Date();
  const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  return value > todayString ? { futureDate: true } : null;
};

const profileImageValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const file = control.value as File | null;
  if (!file) return null;
  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
  const maxSize = 5 * 1024 * 1024;
  if (!allowedTypes.includes(file.type)) return { imageType: true };
  if (file.size > maxSize) return { imageSize: true };
  return null;
};

@Component({
  selector: 'app-profile',
  imports: [AppHeader, DatePipe, RouterLink, ReactiveFormsModule, PostCard, UsernameArrobaPipe],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private postsService = inject(PostsService);
  private estadisticasService = inject(EstadisticasService);
  private toastService = inject(ToastService);
  private platformId = inject(PLATFORM_ID);

  private routeSub?: Subscription;

  paginaLista = signal<boolean>(false);
  errorPerfil = signal<string>('');
  ultimosPosts = signal<PostItem[]>([]);
  totalPublicaciones = signal<number>(0);

  // ID proveniente de /perfil/:id (null si se entra a /perfil)
  perfilRouteId = signal<string | null>(null);
  usuarioVisitado = signal<UsuarioSesion | null>(null);

  // Usuario autenticado (para permisos y edición de perfil propio)
  usuarioActual = computed(() => this.authService.currentUser());
  currentUserId = computed(() => this.authService.currentUserId());
  esAdmin = this.authService.isAdmin;

  // Define si estamos viendo nuestro propio perfil o el de un tercero
  esPerfilPropio = computed(() => {
    const routeId = this.perfilRouteId();
    return !routeId || routeId === this.currentUserId();
  });

  perfilIdActivo = computed(() =>
    this.esPerfilPropio() ? this.currentUserId() : (this.perfilRouteId() ?? ''),
  );

  // Usuario que se renderiza en la tarjeta de perfil
  usuarioMostrado = computed<UsuarioSesion | null>(() =>
    this.esPerfilPropio() ? this.usuarioActual() : this.usuarioVisitado(),
  );

  // Estado del Modal de Edición en 2 pasos (1: Formulario, 2: Confirmar cambio)
  campoEditando = signal<CampoEditable | null>(null);
  confirmandoCambio = signal<boolean>(false);
  guardandoCambio = signal<boolean>(false);
  errorEdicion = signal<string>('');

  // Estado para selector de fecha (idéntico a Registro)
  readonly months = [
    { value: '01', label: 'Enero' },
    { value: '02', label: 'Febrero' },
    { value: '03', label: 'Marzo' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Mayo' },
    { value: '06', label: 'Junio' },
    { value: '07', label: 'Julio' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
  ];
  readonly currentYear = new Date().getFullYear();
  readonly years = Array.from({ length: 110 }, (_, i) => String(this.currentYear - i));

  selectedDay = signal<string>('');
  selectedMonth = signal<string>('');
  selectedYear = signal<string>('');

  availableDays = computed(() => {
    const year = Number(this.selectedYear()) || 2000;
    const month = Number(this.selectedMonth()) || 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0'));
  });

  // Estado para imagen de perfil (idéntico a Registro)
  imagePreview = signal<string | null>(null);

  // Formularios específicos según el campo
  editForm = this.fb.group(
    {
      valorTexto: [''],
      birthDate: ['', [Validators.required, futureDateValidator]],
      profileImage: this.fb.control<File | null>(null, [
        Validators.required,
        profileImageValidator,
      ]),
      password: [''],
      confirmPassword: [''],
    },
    { validators: passwordMatchValidator },
  );

  // Avatar del perfil que se está visualizando en la tarjeta
  avatarPerfilMostrado = computed(() => this.resolverAvatar(this.usuarioMostrado()));

  tituloModal = computed(() => {
    switch (this.campoEditando()) {
      case 'nombre':
        return 'Cambiar nombre';
      case 'apellido':
        return 'Cambiar apellido';
      case 'username':
        return 'Cambiar nombre de usuario';
      case 'descripcion':
        return 'Cambiar descripción';
      case 'fechaNacimiento':
        return 'Cambiar fecha de nacimiento';
      case 'imagen':
        return 'Cambiar imagen de perfil';
      case 'password':
        return 'Cambiar contraseña';
      default:
        return '';
    }
  });

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.routeSub = this.route.paramMap.subscribe((params) => {
        const id = params.get('id');
        this.perfilRouteId.set(id);
        this.cerrarModalEditar();
        this.cargarDatosPerfil();
      });
    }
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.limpiarPreviewUrl();
  }

  private resolverAvatar(user: UsuarioSesion | null): string {
    const url = user?.imagenUrl || user?.fotoPerfil;
    if (url) return url;
    const nombre = user?.username || user?.nombre || 'U';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=4f46e5&color=fff`;
  }

  private limpiarPreviewUrl(): void {
    const prevUrl = this.imagePreview();
    if (prevUrl) {
      URL.revokeObjectURL(prevUrl);
      this.imagePreview.set(null);
    }
  }

  private cargarDatosPerfil(): void {
    this.paginaLista.set(false);
    this.errorPerfil.set('');
    const inicio = Date.now();
    const targetId = this.perfilIdActivo();

    if (!targetId) {
      this.paginaLista.set(true);
      return;
    }

    if (this.esPerfilPropio()) {
      this.usuarioVisitado.set(null);

      this.postsService.getPostsByUser(targetId, 3).subscribe({
        next: async (res) => {
          this.ultimosPosts.set(res.data);
          this.totalPublicaciones.set(res.meta.total);

          const urlsAPrecargar = [
            this.resolverAvatar(this.usuarioActual()),
            ...res.data.map((p) => p.imagenUrl || ''),
          ].filter((url) => !!url);

          await this.precargarImagenes(urlsAPrecargar);

          const restante = Math.max(0, 500 - (Date.now() - inicio));
          setTimeout(() => this.paginaLista.set(true), restante);
        },
        error: (err) => {
          console.error('Error al cargar las publicaciones del perfil:', err);
          this.paginaLista.set(true);
        },
      });
      return;
    }

    // Perfil de un tercero: trae datos públicos + registra la visita en el backend
    forkJoin({
      perfil: this.estadisticasService.getPerfilUsuario(targetId),
      posts: this.postsService.getPostsByUser(targetId, 3),
    }).subscribe({
      next: async ({ perfil, posts }) => {
        this.usuarioVisitado.set(perfil.usuario);
        this.ultimosPosts.set(posts.data);
        this.totalPublicaciones.set(posts.meta.total);

        const urlsAPrecargar = [
          this.resolverAvatar(this.usuarioActual()),
          this.resolverAvatar(perfil.usuario),
          ...posts.data.map((p) => p.imagenUrl || ''),
        ].filter((url) => !!url);

        await this.precargarImagenes(urlsAPrecargar);

        const restante = Math.max(0, 500 - (Date.now() - inicio));
        setTimeout(() => this.paginaLista.set(true), restante);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error al cargar el perfil visitado:', err);
        this.usuarioVisitado.set(null);
        this.ultimosPosts.set([]);
        this.errorPerfil.set(
          err.status === 404
            ? 'El perfil que buscás no existe o fue deshabilitado.'
            : getHttpErrorMessage(err, 'No se pudo cargar este perfil. Intentá nuevamente.'),
        );
        this.paginaLista.set(true);
      },
    });
  }

  private precargarImagenes(urls: string[]): Promise<void> {
    const urlsUnicas = [...new Set(urls)];
    const promesas = urlsUnicas.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = url;
        }),
    );
    return Promise.all(promesas).then(() => undefined);
  }

  // ================= FLUJO DE EDICIÓN DE DATOS DEL PERFIL =================

  abrirModalEditar(campo: CampoEditable): void {
    if (!this.esPerfilPropio()) return;

    const user = this.usuarioActual();
    if (!user) return;

    this.errorEdicion.set('');
    this.confirmandoCambio.set(false);
    this.limpiarPreviewUrl();
    this.editForm.reset();

    const valorTextoCtrl = this.editForm.get('valorTexto')!;
    const passCtrl = this.editForm.get('password')!;
    const confirmPassCtrl = this.editForm.get('confirmPassword')!;

    valorTextoCtrl.clearValidators();
    passCtrl.clearValidators();
    confirmPassCtrl.clearValidators();

    if (campo === 'nombre' || campo === 'apellido') {
      valorTextoCtrl.setValue(campo === 'nombre' ? user.nombre : user.apellido);
      valorTextoCtrl.setValidators([
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50),
        Validators.pattern(/^[\p{L}]+(?:[ '\-][\p{L}]+)*$/u),
      ]);
    } else if (campo === 'username') {
      valorTextoCtrl.setValue(user.username);
      valorTextoCtrl.setValidators([
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9._]{3,20}$/),
      ]);
    } else if (campo === 'descripcion') {
      valorTextoCtrl.setValue(user.descripcion || '');
      valorTextoCtrl.setValidators([Validators.required, Validators.maxLength(350)]);
    } else if (campo === 'fechaNacimiento') {
      const fechaStr = user.fechaNacimiento ? String(user.fechaNacimiento).slice(0, 10) : '';
      if (fechaStr && /^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
        const [y, m, d] = fechaStr.split('-');
        this.selectedYear.set(y);
        this.selectedMonth.set(m);
        this.selectedDay.set(d);
        this.editForm.get('birthDate')?.setValue(fechaStr);
      } else {
        this.selectedYear.set('');
        this.selectedMonth.set('');
        this.selectedDay.set('');
      }
    } else if (campo === 'password') {
      passCtrl.setValidators([
        Validators.required,
        Validators.pattern(/^(?=.*[A-Z])(?=.*\d).{8,}$/),
      ]);
      confirmPassCtrl.setValidators([Validators.required]);
    }

    valorTextoCtrl.updateValueAndValidity();
    passCtrl.updateValueAndValidity();
    confirmPassCtrl.updateValueAndValidity();

    this.campoEditando.set(campo);
  }

  cerrarModalEditar(): void {
    if (this.guardandoCambio()) return;
    this.campoEditando.set(null);
    this.confirmandoCambio.set(false);
    this.errorEdicion.set('');
    this.limpiarPreviewUrl();
  }

  onDatePartChange(part: 'day' | 'month' | 'year', event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (part === 'day') this.selectedDay.set(value);
    if (part === 'month') this.selectedMonth.set(value);
    if (part === 'year') this.selectedYear.set(value);

    const maxDays = this.availableDays().length;
    if (this.selectedDay() && Number(this.selectedDay()) > maxDays) {
      this.selectedDay.set(String(maxDays).padStart(2, '0'));
    }

    const d = this.selectedDay();
    const m = this.selectedMonth();
    const y = this.selectedYear();
    const control = this.editForm.get('birthDate');

    if (d && m && y) {
      control?.setValue(`${y}-${m}-${d}`);
      control?.markAsDirty();
      control?.markAsTouched();
    } else {
      control?.setValue('');
    }
    control?.updateValueAndValidity();
  }

  markBirthDateTouched(): void {
    const control = this.editForm.get('birthDate');
    if (this.selectedDay() && this.selectedMonth() && this.selectedYear()) {
      control?.markAsTouched();
    }
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    const control = this.editForm.get('profileImage');

    if (!file && control?.value) {
      return;
    }

    control?.setValue(file);
    control?.markAsTouched();
    control?.updateValueAndValidity();

    this.limpiarPreviewUrl();

    if (file && control?.valid) {
      this.imagePreview.set(URL.createObjectURL(file));
    }
  }

  avanzarAConfirmacion(): void {
    const campo = this.campoEditando();
    if (!campo) return;

    if (campo === 'nombre' || campo === 'apellido' || campo === 'username' || campo === 'descripcion') {
      const ctrl = this.editForm.get('valorTexto')!;
      ctrl.markAsTouched();
      if (ctrl.invalid) return;
    } else if (campo === 'fechaNacimiento') {
      const ctrl = this.editForm.get('birthDate')!;
      ctrl.markAsTouched();
      if (ctrl.invalid) return;
    } else if (campo === 'imagen') {
      const ctrl = this.editForm.get('profileImage')!;
      ctrl.markAsTouched();
      if (ctrl.invalid) return;
    } else if (campo === 'password') {
      const passCtrl = this.editForm.get('password')!;
      const confCtrl = this.editForm.get('confirmPassword')!;
      passCtrl.markAsTouched();
      confCtrl.markAsTouched();
      if (passCtrl.invalid || confCtrl.invalid || this.editForm.hasError('passwordMismatch')) {
        return;
      }
    }

    this.errorEdicion.set('');
    this.confirmandoCambio.set(true);
  }

  volverAFormulario(): void {
    if (this.guardandoCambio()) return;
    this.confirmandoCambio.set(false);
  }

  confirmarYGuardar(): void {
    const campo = this.campoEditando();
    if (!campo || this.guardandoCambio()) return;

    this.guardandoCambio.set(true);
    this.errorEdicion.set('');

    const formData = new FormData();
    const raw = this.editForm.getRawValue();

    if (campo === 'nombre' || campo === 'apellido' || campo === 'username' || campo === 'descripcion') {
      formData.append(campo, (raw.valorTexto ?? '').trim());
    } else if (campo === 'fechaNacimiento') {
      formData.append('fechaNacimiento', raw.birthDate ?? '');
    } else if (campo === 'imagen' && raw.profileImage) {
      formData.append('imagen', raw.profileImage);
    } else if (campo === 'password') {
      formData.append('password', raw.password ?? '');
    }

    this.authService.actualizarPerfil(formData).subscribe({
      next: () => {
        this.guardandoCambio.set(false);
        this.cerrarModalEditar();
        this.postsService.getPostsByUser(this.currentUserId(), 3).subscribe({
          next: (res) => this.ultimosPosts.set(res.data),
        });
        this.toastService.show('¡Cambios guardados correctamente!', 'success');
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoCambio.set(false);
        this.confirmandoCambio.set(false);
        this.errorEdicion.set(
          getHttpErrorMessage(err, 'No se pudo guardar el cambio. Intentá nuevamente.'),
        );
      },
    });
  }

  // ================= ACCIONES EN LAS PUBLICACIONES DEL PERFIL =================

  manejarLike(postId: string): void {
    this.postsService.toggleLike(postId).subscribe({
      next: (postActualizado) => {
        this.ultimosPosts.update((lista) =>
          lista.map((p) =>
            p._id === postId
              ? { ...postActualizado, commentsCount: p.commentsCount }
              : p,
          ),
        );
      },
    });
  }

  manejarEliminacion(postId: string): void {
    this.postsService.deletePost(postId).subscribe({
      next: () => {
        const targetId = this.perfilIdActivo();
        if (!targetId) return;
        this.postsService.getPostsByUser(targetId, 3).subscribe({
          next: (res) => {
            this.ultimosPosts.set(res.data);
            this.totalPublicaciones.set(res.meta.total);
          },
        });
      },
    });
  }
}