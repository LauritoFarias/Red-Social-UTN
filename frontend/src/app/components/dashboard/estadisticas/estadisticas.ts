import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import {
  EstadisticasService,
  PublicacionesPorUsuarioItem,
  ComentariosPorTiempoResponse,
  ComentariosPorPublicacionItem,
  IngresosPorUsuarioItem,
  VisitasMiPerfilResponse,
  SeriePorDiaItem,
} from '../../../services/estadisticas';

Chart.register(...registerables);

type ChartKey =
  | 'publicacionesUsuario'
  | 'comentariosTiempo'
  | 'comentariosPublicacion'
  | 'ingresosUsuario'
  | 'visitasPerfil'
  | 'likesDia';

@Component({
  selector: 'app-estadisticas',
  imports: [FormsModule],
  templateUrl: './estadisticas.html',
  styleUrl: './estadisticas.scss',
})
export class Estadisticas implements AfterViewInit, OnDestroy {
  private estadisticasService = inject(EstadisticasService);
  private platformId = inject(PLATFORM_ID);

  // Referencias a los 6 canvas
  private canvasPubUsuario = viewChild<ElementRef<HTMLCanvasElement>>('chartPubUsuario');
  private canvasComTiempo = viewChild<ElementRef<HTMLCanvasElement>>('chartComTiempo');
  private canvasComPost = viewChild<ElementRef<HTMLCanvasElement>>('chartComPost');
  private canvasIngresos = viewChild<ElementRef<HTMLCanvasElement>>('chartIngresos');
  private canvasVisitas = viewChild<ElementRef<HTMLCanvasElement>>('chartVisitas');
  private canvasLikes = viewChild<ElementRef<HTMLCanvasElement>>('chartLikes');

  private charts: Record<ChartKey, Chart | null> = {
    publicacionesUsuario: null,
    comentariosTiempo: null,
    comentariosPublicacion: null,
    ingresosUsuario: null,
    visitasPerfil: null,
    likesDia: null,
  };

  // Filtros de rango de fechas (por defecto: últimos 30 días hasta hoy)
  private readonly hoy = this.formatearFechaInput(new Date());
  private readonly hace30Dias = this.formatearFechaInput(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  );

  pubDesde = signal<string>(this.hace30Dias);
  pubHasta = signal<string>(this.hoy);

  comDesde = signal<string>(this.hace30Dias);
  comHasta = signal<string>(this.hoy);

  comPostDesde = signal<string>(this.hace30Dias);
  comPostHasta = signal<string>(this.hoy);

  // Estados de carga, error y totales
  error = signal<string>('');
  cargandoPubUsuario = signal<boolean>(true);
  cargandoComTiempo = signal<boolean>(true);
  cargandoComPost = signal<boolean>(true);
  cargandoIngresos = signal<boolean>(true);
  cargandoVisitas = signal<boolean>(true);
  cargandoLikes = signal<boolean>(true);

  vacioPubUsuario = signal<boolean>(false);
  vacioComTiempo = signal<boolean>(false);
  vacioComPost = signal<boolean>(false);
  vacioIngresos = signal<boolean>(false);
  vacioVisitas = signal<boolean>(false);
  vacioLikes = signal<boolean>(false);

  totalComentarios = signal<number>(0);
  totalVisitasPerfil = signal<number>(0);

  // Paleta coherente con Retro Vibes
  private readonly palette = [
    '#334155',
    '#e11d48',
    '#0891b2',
    '#16a34a',
    '#64748b',
    '#be123c',
    '#0e7490',
    '#475569',
  ];

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.cargarTodasLasEstadisticas();
    }
  }

  ngOnDestroy(): void {
    (Object.keys(this.charts) as ChartKey[]).forEach((key) => {
      this.destruirGrafico(key);
    });
  }

  cargarTodasLasEstadisticas(): void {
    this.error.set('');
    this.cargarPublicacionesPorUsuario();
    this.cargarComentariosPorTiempo();
    this.cargarComentariosPorPublicacion();
    this.cargarIngresosPorUsuario();
    this.cargarVisitasMiPerfil();
    this.cargarLikesPorDia();
  }

  // 1. Publicaciones por usuario en un lapso de tiempo
  cargarPublicacionesPorUsuario(): void {
    this.cargandoPubUsuario.set(true);
    this.estadisticasService
      .getPublicacionesPorUsuario(this.pubDesde(), this.pubHasta())
      .subscribe({
        next: (data) => {
          this.cargandoPubUsuario.set(false);
          this.vacioPubUsuario.set(data.length === 0);
          this.renderPublicacionesPorUsuario(data);
        },
        error: () => {
          this.cargandoPubUsuario.set(false);
          this.error.set('No se pudieron cargar algunas estadísticas.');
        },
      });
  }

  // 2. Comentarios realizados en un lapso de tiempo
  cargarComentariosPorTiempo(): void {
    this.cargandoComTiempo.set(true);
    this.estadisticasService
      .getComentariosPorTiempo(this.comDesde(), this.comHasta())
      .subscribe({
        next: (res) => {
          this.cargandoComTiempo.set(false);
          this.totalComentarios.set(res.total);
          this.vacioComTiempo.set(res.datos.length === 0);
          this.renderComentariosPorTiempo(res);
        },
        error: () => {
          this.cargandoComTiempo.set(false);
          this.error.set('No se pudieron cargar algunas estadísticas.');
        },
      });
  }

  // 3. Comentarios por publicación en un lapso de tiempo
  cargarComentariosPorPublicacion(): void {
    this.cargandoComPost.set(true);
    this.estadisticasService
      .getComentariosPorPublicacion(this.comPostDesde(), this.comPostHasta())
      .subscribe({
        next: (data) => {
          this.cargandoComPost.set(false);
          this.vacioComPost.set(data.length === 0);
          this.renderComentariosPorPublicacion(data);
        },
        error: () => {
          this.cargandoComPost.set(false);
          this.error.set('No se pudieron cargar algunas estadísticas.');
        },
      });
  }

  // 4. Ingresos (log in) por usuario
  cargarIngresosPorUsuario(): void {
    this.cargandoIngresos.set(true);
    this.estadisticasService.getIngresosPorUsuario().subscribe({
      next: (data) => {
        this.cargandoIngresos.set(false);
        this.vacioIngresos.set(data.length === 0);
        this.renderIngresosPorUsuario(data);
      },
      error: () => {
        this.cargandoIngresos.set(false);
        this.error.set('No se pudieron cargar algunas estadísticas.');
      },
    });
  }

  // 5. Visitas a mi perfil (por terceros)
  cargarVisitasMiPerfil(): void {
    this.cargandoVisitas.set(true);
    this.estadisticasService.getVisitasMiPerfil().subscribe({
      next: (res) => {
        this.cargandoVisitas.set(false);
        this.totalVisitasPerfil.set(res.total);
        this.vacioVisitas.set(res.porVisitante.length === 0);
        this.renderVisitasMiPerfil(res);
      },
      error: () => {
        this.cargandoVisitas.set(false);
        this.error.set('No se pudieron cargar algunas estadísticas.');
      },
    });
  }

  // 6. Me gusta otorgados por día
  cargarLikesPorDia(): void {
    this.cargandoLikes.set(true);
    this.estadisticasService.getLikesPorDia().subscribe({
      next: (data) => {
        this.cargandoLikes.set(false);
        this.vacioLikes.set(data.length === 0);
        this.renderLikesPorDia(data);
      },
      error: () => {
        this.cargandoLikes.set(false);
        this.error.set('No se pudieron cargar algunas estadísticas.');
      },
    });
  }

  // ================= RENDER DE GRÁFICOS =================

  private renderPublicacionesPorUsuario(data: PublicacionesPorUsuarioItem[]): void {
    this.crearGrafico('publicacionesUsuario', this.canvasPubUsuario(), {
      type: 'bar',
      data: {
        labels: data.map((d) => `@${d.username}`),
        datasets: [
          {
            label: 'Publicaciones',
            data: data.map((d) => d.cantidad),
            backgroundColor: '#334155',
            borderRadius: 4,
            maxBarThickness: 44,
          },
        ],
      },
      options: this.opcionesBase('Cantidad de publicaciones'),
    });
  }

  private renderComentariosPorTiempo(res: ComentariosPorTiempoResponse): void {
    this.crearGrafico('comentariosTiempo', this.canvasComTiempo(), {
      type: 'line',
      data: {
        labels: res.datos.map((d) => this.formatearFechaCorta(d.fecha)),
        datasets: [
          {
            label: 'Comentarios',
            data: res.datos.map((d) => d.cantidad),
            borderColor: '#e11d48',
            backgroundColor: 'rgba(225, 29, 72, 0.12)',
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: '#e11d48',
            fill: true,
            tension: 0.25,
          },
        ],
      },
      options: this.opcionesBase('Comentarios por día'),
    });
  }

  private renderComentariosPorPublicacion(data: ComentariosPorPublicacionItem[]): void {
    this.crearGrafico('comentariosPublicacion', this.canvasComPost(), {
      type: 'bar',
      data: {
        labels: data.map((d) =>
          d.titulo.length > 28 ? `${d.titulo.slice(0, 28)}…` : d.titulo,
        ),
        datasets: [
          {
            label: 'Comentarios',
            data: data.map((d) => d.cantidad),
            backgroundColor: '#0891b2',
            borderRadius: 4,
            maxBarThickness: 28,
          },
        ],
      },
      options: {
        ...this.opcionesBase('Comentarios'),
        indexAxis: 'y',
      },
    });
  }

  private renderIngresosPorUsuario(data: IngresosPorUsuarioItem[]): void {
    this.crearGrafico('ingresosUsuario', this.canvasIngresos(), {
      type: 'bar',
      data: {
        labels: data.map((d) => `@${d.username}`),
        datasets: [
          {
            label: 'Ingresos (Log in)',
            data: data.map((d) => d.cantidad),
            backgroundColor: '#16a34a',
            borderRadius: 4,
            maxBarThickness: 44,
          },
        ],
      },
      options: this.opcionesBase('Ingresos'),
    });
  }

  private renderVisitasMiPerfil(res: VisitasMiPerfilResponse): void {
    this.crearGrafico('visitasPerfil', this.canvasVisitas(), {
      type: 'doughnut',
      data: {
        labels: res.porVisitante.map((v) => `@${v.username}`),
        datasets: [
          {
            label: 'Visitas',
            data: res.porVisitante.map((v) => v.cantidad),
            backgroundColor: res.porVisitante.map(
              (_, i) => this.palette[i % this.palette.length],
            ),
            borderColor: '#ffffff',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { family: "'Segoe UI', system-ui, sans-serif", size: 12 },
              color: '#0f172a',
            },
          },
        },
      },
    });
  }

  private renderLikesPorDia(data: SeriePorDiaItem[]): void {
    this.crearGrafico('likesDia', this.canvasLikes(), {
      type: 'line',
      data: {
        labels: data.map((d) => this.formatearFechaCorta(d.fecha)),
        datasets: [
          {
            label: 'Me gusta otorgados',
            data: data.map((d) => d.cantidad),
            borderColor: '#334155',
            backgroundColor: 'rgba(51, 65, 85, 0.12)',
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: '#e11d48',
            fill: true,
            tension: 0.25,
          },
        ],
      },
      options: this.opcionesBase('Me gusta'),
    });
  }

  // ================= HELPERS =================

  private crearGrafico(
    key: ChartKey,
    canvasRef: ElementRef<HTMLCanvasElement> | undefined,
    config: ChartConfiguration,
  ): void {
    this.destruirGrafico(key);
    const canvas = canvasRef?.nativeElement;
    if (!canvas) return;
    this.charts[key] = new Chart(canvas, config);
  }

  private destruirGrafico(key: ChartKey): void {
    if (this.charts[key]) {
      this.charts[key]!.destroy();
      this.charts[key] = null;
    }
  }

  private opcionesBase(yLabel: string): ChartConfiguration['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#475569',
            font: { family: "'Segoe UI', system-ui, sans-serif", size: 12 },
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
            color: '#475569',
            font: { family: "'Segoe UI', system-ui, sans-serif", size: 12 },
          },
          grid: { color: '#e2e8f0' },
          title: {
            display: false,
            text: yLabel,
          },
        },
      },
    };
  }

  private formatearFechaInput(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private formatearFechaCorta(isoDate: string): string {
    const partes = isoDate.split('-');
    if (partes.length !== 3) return isoDate;
    return `${partes[2]}/${partes[1]}`;
  }
}