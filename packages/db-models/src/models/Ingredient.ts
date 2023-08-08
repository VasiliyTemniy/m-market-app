import { Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import { PropertiesCreationOptional } from '../types/helpers.js';
import { LocString } from './LocString.js';

export class Ingredient extends Model<InferAttributes<Ingredient>, InferCreationAttributes<Ingredient>> {
  declare id: CreationOptional<number>;
  declare nameLocId: ForeignKey<LocString['id']>;
  declare stockMeasureLocId: ForeignKey<LocString['id']>;
  declare proteins?: number;
  declare fats?: number;
  declare carbohydrates?: number;
  declare calories?: number;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}


export type IngredientData = Omit<InferAttributes<Ingredient>, PropertiesCreationOptional>
  & { id: number; };