import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOgFieldsAndLocalImagePath1741400000000 implements MigrationInterface {
  name = 'AddOgFieldsAndLocalImagePath1741400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "hn_items_metadata"
        ADD COLUMN "og_image" TEXT,
        ADD COLUMN "og_description" TEXT,
        ADD COLUMN "local_image_path" TEXT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "hn_items_metadata"
        DROP COLUMN "og_image",
        DROP COLUMN "og_description",
        DROP COLUMN "local_image_path"
    `);
  }
}
