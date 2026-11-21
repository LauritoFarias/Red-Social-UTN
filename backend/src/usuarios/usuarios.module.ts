import { Module } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Usuario, UsuarioSchema } from './entities/usuario.entity';
import { Post, PostSchema } from '../posts/entities/post.entity';
import { AuthModule } from '../auth/auth.module';
import {
  PerfilVisita,
  PerfilVisitaSchema,
} from '../statistics/entities/profile-view.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Usuario.name, schema: UsuarioSchema },
      { name: Post.name, schema: PostSchema },
      { name: Usuario.name, schema: UsuarioSchema },
      { name: Post.name, schema: PostSchema },
      { name: PerfilVisita.name, schema: PerfilVisitaSchema },
    ]),
    AuthModule,
  ],
  controllers: [UsuariosController],
  providers: [UsuariosService],
  exports: [MongooseModule, UsuariosService],
})
export class UsuariosModule {}