import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFetchRetryTracking1743800000000 implements MigrationInterface {
  name = 'AddFetchRetryTracking1743800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "hn_items_metadata"
        ADD COLUMN "fetch_failed" BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN "fetch_attempt_count" INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN "last_fetch_attempted_at" TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "hn_items_metadata"
        DROP COLUMN "fetch_failed",
        DROP COLUMN "fetch_attempt_count",
        DROP COLUMN "last_fetch_attempted_at"
    `);
  }
}
