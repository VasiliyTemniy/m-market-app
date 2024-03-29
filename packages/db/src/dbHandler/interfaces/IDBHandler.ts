import type { Sequelize } from 'sequelize';
import type * as models from '../../models';

export interface IDBHandler {
  dbInstance: Sequelize | undefined;
  models: typeof models;
  connect(): Promise<void>;
  pingDb(): Promise<void>;
  close(): Promise<void>;
  loadMigrations(): Promise<void>;
  runMigrations(): Promise<void>;
  rollbackMigration(): Promise<void>;
  initFixedEnums(): Promise<void>;
  wipeDb(): Promise<void>;
}