import { Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import { LocString } from './LocString.js';

export class FoodType extends Model<InferAttributes<FoodType>, InferCreationAttributes<FoodType>> {
  declare id: CreationOptional<number>;
  declare nameLocId: ForeignKey<LocString['id']>;
  declare descriptionLocId: ForeignKey<LocString['id']>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}