import {
  Directive,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  Renderer2,
  inject,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

@Directive({
  selector: 'img[appImagenAmpliable]',
  host: {
    '[style.cursor]': '"zoom-in"',
    '(click)': 'abrirImagen($event)',
  },
})
export class ImagenAmpliableDirective implements OnDestroy {
  private el = inject(ElementRef<HTMLImageElement>);
  private renderer = inject(Renderer2);
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);

  private overlay: HTMLElement | null = null;
  private removerListenerEscape: (() => void) | null = null;

  abrirImagen(event: Event): void {
    event.stopPropagation();
    if (!isPlatformBrowser(this.platformId) || this.overlay) return;

    const src = this.el.nativeElement.src;
    const alt = this.el.nativeElement.alt || 'Imagen ampliada';
    if (!src) return;

    // Fondo oscurecido
    const backdrop = this.renderer.createElement('div');
    this.aplicarEstilos(backdrop, {
      position: 'fixed',
      inset: '0',
      backgroundColor: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '9999',
      padding: '24px',
      cursor: 'zoom-out',
    });

    // Contenedor relativo para ubicar el botón cerrar
    const contenedor = this.renderer.createElement('div');
    this.aplicarEstilos(contenedor, {
      position: 'relative',
      display: 'inline-flex',
      maxWidth: '70vw',
      maxHeight: '70vh',
      cursor: 'default',
    });

    // Imagen en tamaño original o limitada al 70% de la pantalla
    const img = this.renderer.createElement('img');
    this.renderer.setAttribute(img, 'src', src);
    this.renderer.setAttribute(img, 'alt', alt);
    this.aplicarEstilos(img, {
      display: 'block',
      width: 'auto',
      height: 'auto',
      maxWidth: '70vw',
      maxHeight: '70vh',
      objectFit: 'contain',
      borderRadius: '12px',
      border: '2px solid #334155',
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
      backgroundColor: '#0f172a',
    });

    // Botón cerrar
    const btnCerrar = this.renderer.createElement('button');
    this.renderer.setAttribute(btnCerrar, 'type', 'button');
    this.renderer.setAttribute(btnCerrar, 'aria-label', 'Cerrar imagen');
    const textoCerrar = this.renderer.createText('✕');
    this.renderer.appendChild(btnCerrar, textoCerrar);
    this.aplicarEstilos(btnCerrar, {
      position: 'absolute',
      top: '-14px',
      right: '-14px',
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      border: '1px solid #475569',
      backgroundColor: '#1e293b',
      color: '#f8fafc',
      fontSize: '14px',
      fontWeight: '700',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
    });

    this.renderer.listen(backdrop, 'click', () => this.cerrarImagen());
    this.renderer.listen(contenedor, 'click', (e: Event) => e.stopPropagation());
    this.renderer.listen(btnCerrar, 'click', () => this.cerrarImagen());

    this.removerListenerEscape = this.renderer.listen(
      'window',
      'keydown',
      (e: KeyboardEvent) => {
        if (e.key === 'Escape') this.cerrarImagen();
      },
    );

    this.renderer.appendChild(contenedor, img);
    this.renderer.appendChild(contenedor, btnCerrar);
    this.renderer.appendChild(backdrop, contenedor);
    this.renderer.appendChild(this.document.body, backdrop);

    this.overlay = backdrop;
  }

  private cerrarImagen(): void {
    if (this.overlay) {
      this.renderer.removeChild(this.document.body, this.overlay);
      this.overlay = null;
    }
    if (this.removerListenerEscape) {
      this.removerListenerEscape();
      this.removerListenerEscape = null;
    }
  }

  private aplicarEstilos(elemento: HTMLElement, estilos: Record<string, string>): void {
    for (const [prop, valor] of Object.entries(estilos)) {
      this.renderer.setStyle(elemento, prop, valor);
    }
  }

  ngOnDestroy(): void {
    this.cerrarImagen();
  }
}