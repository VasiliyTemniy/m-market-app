import { DataTypes } from 'sequelize';
import { MigrationContext } from '../types/MigrationContext.js';

export const up = async ({ context: queryInterface }: MigrationContext) => {
  await queryInterface.createTable('facilities', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    address_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'addresses', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    name_loc_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'loc_strings', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    description_loc_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'loc_strings', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  });
};

export const down = async ({ context: queryInterface }: MigrationContext) => {
  await queryInterface.dropTable('facilities');
};