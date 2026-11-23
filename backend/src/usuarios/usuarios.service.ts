import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Usuario, UsuarioDocument } from './entities/usuario.entity';
import { Post } from '../posts/entities/post.entity';
import {
  PerfilVisita,
  PerfilVisitaDocument,
} from '../statistics/entities/profile-view.entity';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectModel(Usuario.name) private readonly usuarioModel: Model<UsuarioDocument>,
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
    @InjectModel(PerfilVisita.name)
    private readonly perfilVisitaModel: Model<PerfilVisitaDocument>,
  ) {}

  create(createUsuarioDto: CreateUsuarioDto) {
    return this.usuarioModel.create(createUsuarioDto);
  }

  async findAll() {
    return this.usuarioModel.find().select('-password').sort({ createdAt: -1 }).exec();
  }

  findOne(id: string) {
    return this.usuarioModel.findById(id).select('-password -correo -perfil').exec();
  }

  async registrarVisitaPerfil(perfilId: string, visitanteId: string) {
    if (
      !Types.ObjectId.isValid(perfilId) ||
      !Types.ObjectId.isValid(visitanteId) ||
      perfilId === visitanteId
    ) {
      return;
    }

    await this.perfilVisitaModel.create({
      perfilId: new Types.ObjectId(perfilId),
      visitanteId: new Types.ObjectId(visitanteId),
    });
  }

  async findMyProfile(id: string) {
    const [usuario, publicaciones] = await Promise.all([
      this.usuarioModel
        .findById(id)
        .select('nombre apellido correo username fechaNacimiento descripcion imagenUrl perfil activo')
        .lean()
        .exec(),
      this.postModel
        .find({ autor: new Types.ObjectId(id), activo: true })
        .sort({ createdAt: -1 })
        .limit(3)
        .populate('autor', 'username nombre apellido imagenUrl')
        .lean()
        .exec(),
    ]);

    if (!usuario) {
      throw new NotFoundException('No se encontró el perfil del usuario');
    }

    return { usuario, publicaciones };
  }

  async updateProfile(id: string, updateUsuarioDto: UpdateUsuarioDto) {
    const usuario = await this.usuarioModel
      .findByIdAndUpdate(id, { $set: updateUsuarioDto }, { new: true, runValidators: true })
      .select('_id')
      .exec();

    if (!usuario) {
      throw new NotFoundException('No se encontró el perfil del usuario');
    }

    return this.findMyProfile(id);
  }

  async cambiarEstadoActivo(id: string, activo: boolean) {
    const usuario = await this.usuarioModel
      .findByIdAndUpdate(id, { activo }, { new: true })
      .select('-password')
      .exec();

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return usuario;
  }

  private validarObjectId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('El identificador de usuario no es válido.');
    }
  }
}