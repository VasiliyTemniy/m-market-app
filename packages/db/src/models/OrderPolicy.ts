import type {
  Sequelize,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  ForeignKey,
  NonAttribute
} from 'sequelize';
import { Model, DataTypes } from 'sequelize';
import {
  CoverageParentType,
  OrderConfirmationMethod,
  OrderDistanceAvailability,
  OrderPaymentMethod
} from '@m-cafe-app/shared-constants';
import { User } from './User.js';
import { Organization } from './Organization.js';
import { Coverage } from './Coverage.js';


export class OrderPolicy extends Model<InferAttributes<OrderPolicy>, InferCreationAttributes<OrderPolicy>> {
  declare id: CreationOptional<number>;
  declare organizationId: ForeignKey<Organization['id']>;
  declare createdBy: ForeignKey<User['id']>;
  declare updatedBy: ForeignKey<User['id']>;
  declare name: string;
  declare description: string;
  declare paymentMethod: OrderPaymentMethod | null;
  declare confirmationMethod: OrderConfirmationMethod | null;
  declare distanceAvailability: OrderDistanceAvailability | null;
  declare startsAt: Date | null;
  declare endsAt: Date | null;
  declare isActive: boolean;
  declare organization?: NonAttribute<Organization>;
  declare createdByAuthor?: NonAttribute<User>;
  declare updatedByAuthor?: NonAttribute<User>;
  declare coverages?: NonAttribute<Coverage[]>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

  
export const initOrderPolicyModel = async (dbInstance: Sequelize) => {
  return new Promise<void>((resolve, reject) => {
    try {
      OrderPolicy.init({
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        organizationId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'organizations', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        createdBy: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        updatedBy: {
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
          allowNull: false
        },
        description: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        paymentMethod: {
          type: DataTypes.STRING,
          allowNull: true,
          validate: {
            isIn: [Object.values(OrderPaymentMethod)]
          }
        },
        confirmationMethod: {
          type: DataTypes.STRING,
          allowNull: true,
          validate: {
            isIn: [Object.values(OrderConfirmationMethod)]
          }
        },
        distanceAvailability: {
          type: DataTypes.STRING,
          allowNull: true,
          validate: {
            isIn: [Object.values(OrderDistanceAvailability)]
          }
        },
        startsAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        endsAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false
        }
      }, {
        sequelize: dbInstance,
        underscored: true,
        timestamps: true,
        modelName: 'order_policy'
      });

      resolve();
    } catch (err) {
      reject(err);
    }
  });
};


export const initOrderPolicyAssociations = async () => {
  return new Promise<void>((resolve, reject) => {
    try {

      OrderPolicy.belongsTo(Organization, {
        targetKey: 'id',
        foreignKey: 'organizationId',
        as: 'organization',
      });

      OrderPolicy.belongsTo(User, {
        targetKey: 'id',
        foreignKey: 'createdBy',
        as: 'createdByAuthor',
      });

      OrderPolicy.belongsTo(User, {
        targetKey: 'id',
        foreignKey: 'updatedBy',
        as: 'updatedByAuthor',
      });

      OrderPolicy.hasMany(Coverage, {
        foreignKey: 'parentId',
        as: 'coverages',
        scope: {
          parentType: CoverageParentType.OrderPolicy
        },
        constraints: false,
        foreignKeyConstraint: false
      });

      resolve();
    } catch (err) {
      reject(err);
    }
  });
};