import config from './config.js';
import logger from './logger.js';
import { Sequelize } from '@m-cafe-app/shared-backend-deps/sequelize.js';
import { Umzug, SequelizeStorage } from 'umzug';
import { loadMigrations } from '../migrations/index.js';

const disablePgDbSSL = !(process.env.PG_DB_USE_SSL === 'true');

export const sequelize = new Sequelize(config.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  ssl: disablePgDbSSL ? false : true,
  dialectOptions: {
    ssl: disablePgDbSSL ? false : true && {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: !(process.env.NODE_ENV === 'test')
});
logger.info('connecting to ' + config.DATABASE_URL);

export const connectToDatabase = async () => {
  try {
    await sequelize.authenticate();
    await runMigrations();
    logger.info('connected to the database');
  } catch (err) {
    logger.error(err as string);
    logger.info('failed to connect to the database');
    return process.exit(1);
  }

  return null;
};

const migrations = await loadMigrations();

const migrationConf = {
  migrations,
  storage: new SequelizeStorage({ sequelize, tableName: 'migrations' }),
  context: sequelize.getQueryInterface(),
  logger: process.env.NODE_ENV === 'test' ? undefined : console,
};

export const runMigrations = async () => {
  const migrator = new Umzug(migrationConf);
  const migrationsDone = await migrator.up();
  logger.info('Migrations up to date', {
    files: migrationsDone.map((mig) => mig.name),
  });
};

export const rollbackMigration = async () => {
  await sequelize.authenticate();
  const migrator = new Umzug(migrationConf);
  await migrator.down();
};