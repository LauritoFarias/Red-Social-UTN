import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';
import 'multer';
import { Usuario, UsuarioDocument } from '../usuarios/entities/usuario.entity';
import { CreateUsuarioDto } from '../usuarios/dto/create-usuario.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { FileService } from '../file/file.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Usuario.name) private readonly usuarioModel: Model<UsuarioDocument>,
    private readonly fileService: FileService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginAuthDto: LoginAuthDto) {
    const username = loginAuthDto.username.trim();

    const user = await this.usuarioModel.findOne({ username });

    if (!user || !(await bcrypt.compare(loginAuthDto.password, user.password))) {
      throw new UnauthorizedException('Credenciales incorrectas.');
    }

    if (user.activo === false) {
      throw new ForbiddenException(
        'Tu cuenta se encuentra deshabilitada. Contactá a un administrador.',
      );
    }

    await this.usuarioModel.updateOne(
      { _id: user._id },
      { $inc: { loginCount: 1 } },
    );

    return this.generateToken(user);
  }

  async registrar(
    createUsuarioDto: CreateUsuarioDto,
    file: Express.Multer.File,
    authHeader?: string,
  ) {
    const correoNormalizado = createUsuarioDto.correo.trim().toLowerCase();
    const usernameLimpio = createUsuarioDto.username.trim();

    const existe = await this.usuarioModel.findOne({
      $or: [
        { correo: correoNormalizado },
        { username: usernameLimpio },
      ],
    });

    if (existe) {
      if (existe.correo === correoNormalizado) {
        throw new ConflictException(
          'Ya existe una cuenta registrada con ese correo electrónico.',
        );
      }
      throw new ConflictException('Ese nombre de usuario ya está en uso.');
    }

    let perfilAsignado: 'usuario' | 'administrador' = 'usuario';

    if (createUsuarioDto.perfil === 'administrador' && authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const payload = await this.jwtService.verifyAsync(token);
        const solicitante = await this.usuarioModel
          .findById(payload.sub)
          .select('perfil activo');
        if (
          solicitante &&
          solicitante.activo !== false &&
          solicitante.perfil === 'administrador'
        ) {
          perfilAsignado = 'administrador';
        }
      } catch {
        perfilAsignado = 'usuario';
      }
    }

    const imagenUrl = await this.fileService.cloudinaryUploader(file);
    const hashedPassword = await bcrypt.hash(createUsuarioDto.password, 10);

    const newUser = await this.usuarioModel.create({
      ...createUsuarioDto,
      nombre: createUsuarioDto.nombre.trim(),
      apellido: createUsuarioDto.apellido.trim(),
      correo: correoNormalizado,
      username: usernameLimpio,
      descripcion: createUsuarioDto.descripcion?.trim() ?? '',
      password: hashedPassword,
      imagenUrl,
      perfil: perfilAsignado,
    });

    const { password, ...usuarioSinPassword } = newUser.toObject();
    return { usuario: usuarioSinPassword };
  }

  async getPerfil(id: string) {
    const user = await this.usuarioModel.findById(id).select('-password');

    if (!user) {
      throw new NotFoundException('No se pudo obtener el perfil.');
    }

    return user;
  }

  async generateToken(usuario: UsuarioDocument) {
    const payload = {
      sub: usuario._id.toString(),
      correo: usuario.correo,
      username: usuario.username,
      perfil: usuario.perfil,
    };

    const { password, ...usuarioSinPassword } = usuario.toObject();

    return {
      access_token: await this.jwtService.signAsync(payload),
      usuario: usuarioSinPassword,
    };
  }

  setTokenCookie(res: Response, token: string) {
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: false,
      maxAge: 1000 * 60 * 15,
    });
  }

  async refreshToken(userId: string) {
    const user = await this.usuarioModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }
    if (user.activo === false) {
      throw new ForbiddenException('Tu cuenta se encuentra deshabilitada.');
    }
    return this.generateToken(user);
  }

  async actualizarPerfil(
    userId: string,
    datos: {
      nombre?: string;
      apellido?: string;
      username?: string;
      descripcion?: string;
      fechaNacimiento?: string;
      password?: string;
    },
    file?: Express.Multer.File,
  ) {
    const user = await this.usuarioModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    if (datos.username && datos.username.trim() !== user.username) {
      const usernameLimpio = datos.username.trim();
      const existeUsername = await this.usuarioModel.findOne({
        username: usernameLimpio,
        _id: { $ne: user._id },
      });
      if (existeUsername) {
        throw new ConflictException('Ese nombre de usuario ya está en uso.');
      }
      user.username = usernameLimpio;
    }

    if (datos.nombre !== undefined) user.nombre = datos.nombre.trim();
    if (datos.apellido !== undefined) user.apellido = datos.apellido.trim();
    if (datos.descripcion !== undefined) user.descripcion = datos.descripcion.trim();
    if (datos.fechaNacimiento !== undefined) {
      (user as any).fechaNacimiento = datos.fechaNacimiento;
    }

    if (datos.password) {
      user.password = await bcrypt.hash(datos.password, 10);
    }

    if (file) {
      user.imagenUrl = await this.fileService.cloudinaryUploader(file);
    }

    await user.save();

    const { password, ...usuarioActualizado } = user.toObject();
    return { usuario: usuarioActualizado };
  }
}