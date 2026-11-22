import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Usuario, UsuarioDocument } from '../usuarios/entities/usuario.entity';
import { Post } from '../posts/entities/post.entity';
import { Comment } from '../comments/entities/comment.entity';
import { LikeEvent, LikeEventDocument } from './entities/like-event.entity';
import {
  PerfilVisita,
  PerfilVisitaDocument,
} from './entities/profile-view.entity';

const TIMEZONE = 'America/Argentina/Buenos_Aires';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectModel(Usuario.name) private readonly usuarioModel: Model<UsuarioDocument>,
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
    @InjectModel(Comment.name) private readonly commentModel: Model<Comment>,
    @InjectModel(LikeEvent.name) private readonly likeEventModel: Model<LikeEventDocument>,
    @InjectModel(PerfilVisita.name)
    private readonly perfilVisitaModel: Model<PerfilVisitaDocument>,
  ) {}

  private construirRangoFechas(desde?: string, hasta?: string): { $gte: Date; $lte: Date } {
    const ahora = new Date();
    const fechaHasta = hasta
      ? new Date(`${hasta}T23:59:59.999-03:00`)
      : ahora;

    const fechaDesde = desde
      ? new Date(`${desde}T00:00:00.000-03:00`)
      : new Date(fechaHasta.getTime() - 30 * 24 * 60 * 60 * 1000);

    return { $gte: fechaDesde, $lte: fechaHasta };
  }

  // Obtiene el perfil público de un usuario y guarda la visita si quien mira es un tercero
  async obtenerPerfilYRegistrarVisita(perfilId: string, visitanteId?: string) {
    if (!Types.ObjectId.isValid(perfilId)) {
      throw new BadRequestException('ID de usuario inválido');
    }

    const usuario = await this.usuarioModel
      .findOne({ _id: perfilId, activo: { $ne: false } })
      .select(
        '_id nombre apellido username imagenUrl fotoPerfil descripcion fechaNacimiento perfil activo createdAt',
      )
      .lean()
      .exec();

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (
      visitanteId &&
      Types.ObjectId.isValid(visitanteId) &&
      visitanteId !== perfilId
    ) {
      await this.perfilVisitaModel.create({
        perfilId: new Types.ObjectId(perfilId),
        visitanteId: new Types.ObjectId(visitanteId),
      });
    }

    return { usuario };
  }

  // 1. Cantidad de publicaciones por usuario en un lapso de tiempo
  async publicacionesPorUsuario(desde?: string, hasta?: string) {
    const rango = this.construirRangoFechas(desde, hasta);

    return this.postModel.aggregate([
      {
        $match: {
          activo: { $ne: false },
          createdAt: rango,
        },
      },
      {
        $addFields: {
          autorObjectId: { $toObjectId: '$autor' },
        },
      },
      {
        $group: {
          _id: '$autorObjectId',
          cantidad: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'usuarios',
          localField: '_id',
          foreignField: '_id',
          as: 'usuario',
        },
      },
      { $unwind: { path: '$usuario', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          usuarioId: { $toString: '$_id' },
          username: { $ifNull: ['$usuario.username', 'desconocido'] },
          nombreCompleto: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ['$usuario.nombre', ''] },
                  ' ',
                  { $ifNull: ['$usuario.apellido', ''] },
                ],
              },
            },
          },
          cantidad: 1,
        },
      },
      { $sort: { cantidad: -1 } },
    ]);
  }

  // 2. Cantidad de comentarios realizados en un lapso de tiempo (agrupado por día)
  async comentariosPorTiempo(desde?: string, hasta?: string) {
    const rango = this.construirRangoFechas(desde, hasta);

    const porDia = await this.commentModel.aggregate([
      {
        $match: {
          activo: { $ne: false },
          createdAt: rango,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
              timezone: TIMEZONE,
            },
          },
          cantidad: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          fecha: '$_id',
          cantidad: 1,
        },
      },
      { $sort: { fecha: 1 } },
    ]);

    const total = porDia.reduce((acc, item) => acc + item.cantidad, 0);
    return { total, datos: porDia };
  }

  // 3. Cantidad de comentarios en cada publicación en un lapso de tiempo
  async comentariosPorPublicacion(desde?: string, hasta?: string) {
    const rango = this.construirRangoFechas(desde, hasta);

    return this.commentModel.aggregate([
      {
        $match: {
          activo: { $ne: false },
          createdAt: rango,
        },
      },
      {
        $addFields: {
          postObjectId: { $toObjectId: '$postId' },
        },
      },
      {
        $group: {
          _id: '$postObjectId',
          cantidad: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'posts',
          localField: '_id',
          foreignField: '_id',
          as: 'post',
        },
      },
      { $unwind: { path: '$post', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          postId: { $toString: '$_id' },
          titulo: { $ifNull: ['$post.titulo', 'Publicación eliminada'] },
          cantidad: 1,
        },
      },
      { $sort: { cantidad: -1 } },
    ]);
  }

  // 4. Cantidad de ingresos (log in) por usuario
  async ingresosPorUsuario() {
    const usuarios = await this.usuarioModel
      .find()
      .select('username nombre apellido loginCount')
      .sort({ loginCount: -1, username: 1 })
      .lean()
      .exec();

    return usuarios.map((u) => ({
      usuarioId: u._id.toString(),
      username: u.username,
      nombreCompleto: `${u.nombre} ${u.apellido}`.trim(),
      cantidad: u.loginCount ?? 0,
    }));
  }

  // 5. Cantidad de visitas a mi perfil (solo por parte de terceros)
  async visitasMiPerfil(miUsuarioId: string) {
    const miObjectId = new Types.ObjectId(miUsuarioId);

    const [porVisitante, porDia] = await Promise.all([
      this.perfilVisitaModel.aggregate([
        {
          $match: {
            perfilId: miObjectId,
            visitanteId: { $ne: miObjectId },
          },
        },
        {
          $group: {
            _id: '$visitanteId',
            cantidad: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: 'usuarios',
            localField: '_id',
            foreignField: '_id',
            as: 'visitante',
          },
        },
        { $unwind: { path: '$visitante', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            usuarioId: { $toString: '$_id' },
            username: { $ifNull: ['$visitante.username', 'desconocido'] },
            nombreCompleto: {
              $trim: {
                input: {
                  $concat: [
                    { $ifNull: ['$visitante.nombre', ''] },
                    ' ',
                    { $ifNull: ['$visitante.apellido', ''] },
                  ],
                },
              },
            },
            cantidad: 1,
          },
        },
        { $sort: { cantidad: -1 } },
      ]),
      this.perfilVisitaModel.aggregate([
        {
          $match: {
            perfilId: miObjectId,
            visitanteId: { $ne: miObjectId },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt',
                timezone: TIMEZONE,
              },
            },
            cantidad: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            fecha: '$_id',
            cantidad: 1,
          },
        },
        { $sort: { fecha: 1 } },
      ]),
    ]);

    const total = porVisitante.reduce((acc, item) => acc + item.cantidad, 0);
    return { total, porVisitante, porDia };
  }

  // 6. Cantidad de me gusta otorgados por día
  async likesPorDia() {
    return this.likeEventModel.aggregate([
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
              timezone: TIMEZONE,
            },
          },
          cantidad: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          fecha: '$_id',
          cantidad: 1,
        },
      },
      { $sort: { fecha: 1 } },
    ]);
  }
}