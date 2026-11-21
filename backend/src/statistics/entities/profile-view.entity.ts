import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export type PerfilVisitaDocument = HydratedDocument<PerfilVisita>;

@Schema({ timestamps: true })
export class PerfilVisita {
  @Prop({ type: Types.ObjectId, ref: Usuario.name, required: true, index: true })
  perfilId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Usuario.name, required: true, index: true })
  visitanteId: Types.ObjectId;
}

export const PerfilVisitaSchema = SchemaFactory.createForClass(PerfilVisita);
PerfilVisitaSchema.index({ perfilId: 1, createdAt: 1 });