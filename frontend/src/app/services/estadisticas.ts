import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth';

export interface PublicacionesPorUsuarioItem {
  usuarioId: string;
  username: string;
  nombreCompleto: string;
  cantidad: number;
}

export interface SeriePorDiaItem {
  fecha: string;
  cantidad: number;
}

export interface ComentariosPorTiempoResponse {
  total: number;
  datos: SeriePorDiaItem[];
}

export interface ComentariosPorPublicacionItem {
  postId: string;
  titulo: string;
  cantidad: number;
}

export interface IngresosPorUsuarioItem {
  usuarioId: string;
  username: string;
  nombreCompleto: string;
  cantidad: number;
}

export interface VisitantePerfilItem {
  usuarioId: string;
  username: string;
  nombreCompleto: string;
  cantidad: number;
}

export interface VisitasMiPerfilResponse {
  total: number;
  porVisitante: VisitantePerfilItem[];
  porDia: SeriePorDiaItem[];
}

@Injectable({
  providedIn: 'root',
})
export class EstadisticasService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private apiUrl = `${environment.apiUrl}/statistics`;

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return token
      ? new HttpHeaders().set('Authorization', `Bearer ${token}`)
      : new HttpHeaders();
  }

  private buildDateParams(desde?: string, hasta?: string): HttpParams {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return params;
  }

  getPublicacionesPorUsuario(
    desde?: string,
    hasta?: string,
  ): Observable<PublicacionesPorUsuarioItem[]> {
    return this.http.get<PublicacionesPorUsuarioItem[]>(
      `${this.apiUrl}/publicaciones-por-usuario`,
      {
        headers: this.getAuthHeaders(),
        params: this.buildDateParams(desde, hasta),
      },
    );
  }

  getComentariosPorTiempo(
    desde?: string,
    hasta?: string,
  ): Observable<ComentariosPorTiempoResponse> {
    return this.http.get<ComentariosPorTiempoResponse>(
      `${this.apiUrl}/comentarios-por-tiempo`,
      {
        headers: this.getAuthHeaders(),
        params: this.buildDateParams(desde, hasta),
      },
    );
  }

  getComentariosPorPublicacion(
    desde?: string,
    hasta?: string,
  ): Observable<ComentariosPorPublicacionItem[]> {
    return this.http.get<ComentariosPorPublicacionItem[]>(
      `${this.apiUrl}/comentarios-por-publicacion`,
      {
        headers: this.getAuthHeaders(),
        params: this.buildDateParams(desde, hasta),
      },
    );
  }

  getIngresosPorUsuario(): Observable<IngresosPorUsuarioItem[]> {
    return this.http.get<IngresosPorUsuarioItem[]>(
      `${this.apiUrl}/ingresos-por-usuario`,
      { headers: this.getAuthHeaders() },
    );
  }

  getVisitasMiPerfil(): Observable<VisitasMiPerfilResponse> {
    return this.http.get<VisitasMiPerfilResponse>(
      `${this.apiUrl}/visitas-mi-perfil`,
      { headers: this.getAuthHeaders() },
    );
  }

  getLikesPorDia(): Observable<SeriePorDiaItem[]> {
    return this.http.get<SeriePorDiaItem[]>(`${this.apiUrl}/likes-por-dia`, {
      headers: this.getAuthHeaders(),
    });
  }
}