import type { MigrationContext } from '../types/Migrations.js';
import { DataTypes } from 'sequelize';
import {
  ratingLowestLimit,
  ratingHighestLimit,
  isReviewParentType,
} from '@m-market-app/shared-constants';

export const up = async ({ context: queryInterface }: MigrationContext) => {
  await queryInterface.createTable('reviews', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    parent_type: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      validate: {
        isReviewParentTypeValidator(value: unknown) {
          if (!isReviewParentType(value)) {
            throw new Error(`Invalid review parent type: ${value}`);
          }
        }
      },
      unique: 'review_unique'
    },
    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: 'review_unique'
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      unique: 'review_unique'
    },
    text: {
      type: DataTypes.STRING(5000),
      allowNull: true
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: ratingLowestLimit,
        max: ratingHighestLimit
      }
    },
    blocked_reason: {
      type: DataTypes.STRING,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    uniqueKeys: {
      review_unique: {
        fields: ['parent_type', 'parent_id', 'user_id']
      }
    }
  });
};

export const down = async ({ context: queryInterface }: MigrationContext) => {
  await queryInterface.dropTable('reviews');
};