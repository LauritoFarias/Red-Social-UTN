import {
  Controller,
  Get,
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
@UseGuards(AuthGuard, AdminGuard)
export class StatisticsController {
  constructor(private readonly estadisticasService: StatisticsService) {}

  @Get('publicaciones-por-usuario')
  publicacionesPorUsuario(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.estadisticasService.publicacionesPorUsuario(desde, hasta);
  }

  @Get('comentarios-por-tiempo')
  comentariosPorTiempo(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.estadisticasService.comentariosPorTiempo(desde, hasta);
  }

  @Get('comentarios-por-publicacion')
  comentariosPorPublicacion(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.estadisticasService.comentariosPorPublicacion(desde, hasta);
  }

  @Get('ingresos-por-usuario')
  ingresosPorUsuario() {
    return this.estadisticasService.ingresosPorUsuario();
  }

  @Get('visitas-mi-perfil')
  visitasMiPerfil(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('No se pudo identificar al usuario autenticado');
    }
    return this.estadisticasService.visitasMiPerfil(userId);
  }

  @Get('likes-por-dia')
  likesPorDia() {
    return this.estadisticasService.likesPorDia();
  }
}