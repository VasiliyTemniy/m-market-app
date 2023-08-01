import { Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from '@m-cafe-app/shared-backend-deps/sequelize.js';
import { LocString } from './LocString.js';

export class Picture extends Model<InferAttributes<Picture>, InferCreationAttributes<Picture>> {
  declare id: CreationOptional<number>;
  declare src: string;
  declare altTextLocId: ForeignKey<LocString['id']>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}