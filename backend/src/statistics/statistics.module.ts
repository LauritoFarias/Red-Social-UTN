import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { Usuario, UsuarioSchema } from '../usuarios/entities/usuario.entity';
import { Post, PostSchema } from '../posts/entities/post.entity';
import { Comment, CommentSchema } from '../comments/entities/comment.entity';
import { LikeEvent, LikeEventSchema } from './entities/like-event.entity';
import {
  PerfilVisita,
  PerfilVisitaSchema,
} from './entities/profile-view.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Usuario.name, schema: UsuarioSchema },
      { name: Post.name, schema: PostSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: LikeEvent.name, schema: LikeEventSchema },
      { name: PerfilVisita.name, schema: PerfilVisitaSchema },
    ]),
  ],
  controllers: [StatisticsController],
  providers: [StatisticsService],
})
export class StatisticsModule {}