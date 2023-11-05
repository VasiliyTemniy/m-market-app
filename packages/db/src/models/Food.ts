import type { InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey, NonAttribute } from 'sequelize';
import type { PropertiesCreationOptional } from '@m-cafe-app/shared-constants';
import type { Sequelize } from 'sequelize';
import { Model, DataTypes } from 'sequelize';
import { FoodComponent } from './FoodComponent.js';
import { FoodPicture } from './FoodPicture.js';
import { FoodType } from './FoodType.js';
import { LocString } from './LocString.js';


export class Food extends Model<InferAttributes<Food>, InferCreationAttributes<Food>> {
  declare id: CreationOptional<number>;
  declare nameLocId: ForeignKey<LocString['id']>;
  declare foodTypeId: ForeignKey<FoodType['id']>;
  declare descriptionLocId: ForeignKey<LocString['id']>;
  declare price: number;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare foodType?: NonAttribute<FoodType>;
  declare nameLoc?: NonAttribute<LocString>;
  declare descriptionLoc?: NonAttribute<LocString>;
  declare foodComponents?: NonAttribute<FoodComponent[]>;
  declare gallery?: NonAttribute<FoodPicture[]>;
}


export type FoodData = Omit<InferAttributes<Food>, PropertiesCreationOptional>
  & { id: number; };


export const initFoodModel = async (dbInstance: Sequelize) => {

  const includeLocStrings = [
    {
      model: LocString,
      as: 'nameLoc',
      attributes: {
        exclude: ['createdAt', 'updatedAt']
      }
    },
    {
      model: LocString,
      as: 'descriptionLoc',
      attributes: {
        exclude: ['createdAt', 'updatedAt']
      }
    }
  ];

  return new Promise<void>((resolve, reject) => {
    try {
      Food.init({
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        nameLocId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'loc_strings', key: 'id' }
        },
        foodTypeId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'food_types', key: 'id' }
        },
        descriptionLocId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'loc_strings', key: 'id' }
        },
        price: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false
        },
      }, {
        sequelize: dbInstance,
        underscored: true,
        timestamps: true,
        modelName: 'foods',
        defaultScope: {
          attributes: {
            exclude: ['createdAt', 'updatedAt']
          },
          include: includeLocStrings
        },
        scopes: {
          all: {
            attributes: {
              exclude: ['createdAt', 'updatedAt']
            },
            include: includeLocStrings
          },
          allWithTimestamps: {}
        }
      });
      
      resolve();
    } catch (err) {
      reject(err);
    }
  });
};