import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHnItemsMetadata1741312000000 implements MigrationInterface {
  name = 'CreateHnItemsMetadata1741312000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "hn_items_metadata" (
        "id"                INTEGER   NOT NULL,
        "tiny_description"  TEXT,
        "short_description" TEXT,
        "image_url"         TEXT,
        "created_at"        TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_hn_items_metadata" PRIMARY KEY ("id"),
        CONSTRAINT "FK_hn_items_metadata_item" FOREIGN KEY ("id")
          REFERENCES "hn_items"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "hn_items_metadata"`);
  }
}
