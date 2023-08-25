import { Model, InferAttributes, InferCreationAttributes, CreationOptional, DataTypes } from 'sequelize';
import { PropertiesCreationOptional } from '../types/helpers.js';
import { sequelize } from '../db.js';


export class UiSetting extends Model<InferAttributes<UiSetting>, InferCreationAttributes<UiSetting>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare value: string;
}


export type UiSettingData = Omit<InferAttributes<UiSetting>, PropertiesCreationOptional>
  & { id: number; };

  
UiSetting.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  value: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  sequelize,
  underscored: true,
  timestamps: false,
  modelName: 'ui_setting'
});
  
export default UiSetting;