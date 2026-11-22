import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { StatisticsService } from './statistics.service';
import { AuthGuard } from '../guards/auth/auth.guard';
import { AdminGuard } from '../guards/admin/admin.guard';

interface AuthenticatedRequest extends Request {
  user?: { sub?: string; perfil?: string };
}

@Controller('statistics')
@UseGuards(AuthGuard)
export class StatisticsController {
  constructor(private readonly estadisticasService: StatisticsService) {}

  // Accesible para cualquier usuario autenticado: obtiene datos públicos y registra la visita
  @Get('perfil/:id')
  obtenerPerfilYRegistrarVisita(
    @Param('id') perfilId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const visitanteId = req.user?.sub;
    return this.estadisticasService.obtenerPerfilYRegistrarVisita(perfilId, visitanteId);
  }

  @Get('publicaciones-por-usuario')
  @UseGuards(AdminGuard)
  publicacionesPorUsuario(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.estadisticasService.publicacionesPorUsuario(desde, hasta);
  }

  @Get('comentarios-por-tiempo')
  @UseGuards(AdminGuard)
  comentariosPorTiempo(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.estadisticasService.comentariosPorTiempo(desde, hasta);
  }

  @Get('comentarios-por-publicacion')
  @UseGuards(AdminGuard)
  comentariosPorPublicacion(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.estadisticasService.comentariosPorPublicacion(desde, hasta);
  }

  @Get('ingresos-por-usuario')
  @UseGuards(AdminGuard)
  ingresosPorUsuario() {
    return this.estadisticasService.ingresosPorUsuario();
  }

  @Get('visitas-mi-perfil')
  @UseGuards(AdminGuard)
  visitasMiPerfil(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('No se pudo identificar al usuario autenticado');
    }
    return this.estadisticasService.visitasMiPerfil(userId);
  }

  @Get('likes-por-dia')
  @UseGuards(AdminGuard)
  likesPorDia() {
    return this.estadisticasService.likesPorDia();
  }
}