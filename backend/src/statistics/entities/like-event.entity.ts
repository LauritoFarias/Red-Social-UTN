import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Post } from '../../posts/entities/post.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export type LikeEventDocument = HydratedDocument<LikeEvent>;

@Schema({ timestamps: true })
export class LikeEvent {
  @Prop({ type: Types.ObjectId, ref: Post.name, required: true, index: true })
  postId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Usuario.name, required: true, index: true })
  usuarioId: Types.ObjectId;
}

export const LikeEventSchema = SchemaFactory.createForClass(LikeEvent);
LikeEventSchema.index({ createdAt: 1 });