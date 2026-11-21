import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Headers,
  UseGuards,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { AuthGuard } from '../guards/auth/auth.guard';
import { AdminGuard } from '../guards/admin/admin.guard';

interface AuthenticatedRequest extends Request {
  user?: { sub?: string; perfil?: string };
}

@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
  ) {}

  @Post()
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuariosService.create(createUsuarioDto);
  }

  @Get()
  @UseGuards(AuthGuard, AdminGuard)
  findAll() {
    return this.usuariosService.findAll();
  }

  @Get('me')
  @UseGuards(AuthGuard)
  findMyProfile(@Req() req: AuthenticatedRequest) {
    return this.usuariosService.findMyProfile(this.getAuthenticatedUserId(req));
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  updateMyProfile(
    @Req() req: AuthenticatedRequest,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
  ) {
    return this.usuariosService.updateProfile(
      this.getAuthenticatedUserId(req),
      updateUsuarioDto,
    );
  }

  @Patch(':id/alta')
  @UseGuards(AuthGuard, AdminGuard)
  habilitar(@Param('id') id: string) {
    return this.usuariosService.cambiarEstadoActivo(id, true);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Headers('authorization') authHeader?: string,
  ) {
    const usuario = await this.usuariosService.findOne(id);

    if (usuario && authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const payload = await this.jwtService.verifyAsync(token);
        if (payload?.sub && payload.sub !== id) {
          await this.usuariosService.registrarVisitaPerfil(id, payload.sub);
        }
      } catch {
        // Si el token es inválido/expirado, no bloquea la vista pública
      }
    }

    return usuario;
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (this.getAuthenticatedUserId(req) !== id) {
      throw new ForbiddenException('Solo puedes editar tu propio perfil');
    }
    return this.usuariosService.updateProfile(id, updateUsuarioDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, AdminGuard)
  deshabilitar(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    if (this.getAuthenticatedUserId(req) === id) {
      throw new ForbiddenException('No podés deshabilitar tu propia cuenta');
    }
    return this.usuariosService.cambiarEstadoActivo(id, false);
  }

  private getAuthenticatedUserId(req: AuthenticatedRequest): string {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('No se pudo identificar al usuario autenticado');
    }
    return userId;
  }
}