import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFaviconFields1743900000000 implements MigrationInterface {
  name = 'AddFaviconFields1743900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "hn_items_metadata"
        ADD COLUMN "favicon_url" TEXT,
        ADD COLUMN "local_favicon_path" TEXT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "hn_items_metadata"
        DROP COLUMN "favicon_url",
        DROP COLUMN "local_favicon_path"
    `);
  }
}
