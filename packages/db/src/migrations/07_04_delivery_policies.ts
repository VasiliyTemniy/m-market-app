import type { MigrationContext } from '../types/Migrations.js';
import {
  DeliveryCostCalculationType,
  MassEnum,
  SizingEnum,
  VolumeEnum
} from '@m-cafe-app/shared-constants';
import { DataTypes } from 'sequelize';

export const up = async ({ context: queryInterface }: MigrationContext) => {
  await queryInterface.createTable('delivery_policies', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    organization_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'organizations', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    // coverage is referenced from coverages table
    // name and description should not be localized - internal organization business logic
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    delivery_cost_calculation_type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [Object.values(DeliveryCostCalculationType)],
      }
    },
    fixed_cost_addon: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    distance_step_cost: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    distance_step_quantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    distance_step_measure: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIn: [Object.values(SizingEnum)],
      }
    },
    mass_step_cost: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    mass_step_quantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    mass_step_measure: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIn: [Object.values(MassEnum)],
      }
    },
    volume_step_cost: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    volume_step_quantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    volume_step_measure: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIn: [Object.values(VolumeEnum)],
      }
    },
    starts_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ends_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    }
  });
};

export const down = async ({ context: queryInterface }: MigrationContext) => {
  await queryInterface.dropTable('delivery_policies');
};