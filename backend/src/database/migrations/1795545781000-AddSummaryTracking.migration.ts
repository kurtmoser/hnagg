import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSummaryTracking1795545781000 implements MigrationInterface {
  name = 'AddSummaryTracking1795545781000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "hn_items_metadata"
        ADD COLUMN "summary_attempt_count" INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN "summary_generated_at" TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "hn_items_metadata"
        DROP COLUMN "summary_attempt_count",
        DROP COLUMN "summary_generated_at"
    `);
  }
}
