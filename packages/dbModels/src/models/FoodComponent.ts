import { Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from '@m-cafe-app/shared-backend-deps/sequelize.js';
import { Food } from './Food.js';

export class FoodComponent extends Model<InferAttributes<FoodComponent>, InferCreationAttributes<FoodComponent>> {
  declare id: CreationOptional<number>;
  declare foodId: ForeignKey<Food['id']>;
  declare componentId: number;
  declare amount: number;
  declare compositeFood: boolean;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}