import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'hackernews',
  password: process.env.DB_PASSWORD || 'hackernews',
  database: process.env.DB_NAME || 'hackernews',
  entities: [__dirname + '/**/*.entity.{js,ts}'],
  migrations: [__dirname + '/**/*.migration.{js,ts}'],
  migrationsRun: false,
  synchronize: false,
});
