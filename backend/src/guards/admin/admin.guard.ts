import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Usuario, UsuarioDocument } from '../../usuarios/entities/usuario.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @InjectModel(Usuario.name)
    private readonly usuarioModel: Model<UsuarioDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;

    if (!userId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    const usuario = await this.usuarioModel.findById(userId).select('perfil').lean();

    if (!usuario || usuario.perfil !== 'administrador') {
      throw new ForbiddenException('Acceso restringido solo a administradores');
    }

    request.user.perfil = usuario.perfil;
    return true;
  }
}