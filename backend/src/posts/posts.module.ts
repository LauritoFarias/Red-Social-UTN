import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { Post, PostSchema } from './entities/post.entity';
import { Comment, CommentSchema } from '../comments/entities/comment.entity';
import { AuthModule } from '../auth/auth.module';
import { FileService } from '../file/file.service';
import {
  LikeEvent,
  LikeEventSchema,
} from '../statistics/entities/like-event.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: Post.name, schema: PostSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: LikeEvent.name, schema: LikeEventSchema },
    ]),
    AuthModule,
  ],
  controllers: [PostsController],
  providers: [PostsService, FileService],
})
export class PostsModule {}