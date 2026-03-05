import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDescendantsSnapshots1741211000000 implements MigrationInterface {
  name = 'CreateDescendantsSnapshots1741211000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "descendants_snapshots" (
        "id"          SERIAL         NOT NULL,
        "item_id"     integer        NOT NULL,
        "descendants" integer        NOT NULL,
        "recorded_at" TIMESTAMP      NOT NULL DEFAULT now(),
        CONSTRAINT "PK_descendants_snapshots" PRIMARY KEY ("id"),
        CONSTRAINT "FK_descendants_snapshots_item" FOREIGN KEY ("item_id")
          REFERENCES "hn_items"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_descendants_snapshots_item_id" ON "descendants_snapshots" ("item_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_descendants_snapshots_item_recorded" ON "descendants_snapshots" ("item_id", "recorded_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_descendants_snapshots_item_recorded"`);
    await queryRunner.query(`DROP INDEX "IDX_descendants_snapshots_item_id"`);
    await queryRunner.query(`DROP TABLE "descendants_snapshots"`);
  }
}
