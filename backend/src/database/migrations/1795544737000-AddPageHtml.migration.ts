import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPageHtml1795544737000 implements MigrationInterface {
  name = 'AddPageHtml1795544737000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "hn_items_metadata"
        ADD COLUMN "page_html" TEXT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "hn_items_metadata"
        DROP COLUMN "page_html"
    `);
  }
}
