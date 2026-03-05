import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateScoreSnapshots1741210000000 implements MigrationInterface {
  name = 'CreateScoreSnapshots1741210000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "score_snapshots" (
        "id"          SERIAL         NOT NULL,
        "item_id"     integer        NOT NULL,
        "score"       integer        NOT NULL,
        "recorded_at" TIMESTAMP      NOT NULL DEFAULT now(),
        CONSTRAINT "PK_score_snapshots" PRIMARY KEY ("id"),
        CONSTRAINT "FK_score_snapshots_item" FOREIGN KEY ("item_id")
          REFERENCES "hn_items"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_score_snapshots_item_id" ON "score_snapshots" ("item_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_score_snapshots_item_recorded" ON "score_snapshots" ("item_id", "recorded_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_score_snapshots_item_recorded"`);
    await queryRunner.query(`DROP INDEX "IDX_score_snapshots_item_id"`);
    await queryRunner.query(`DROP TABLE "score_snapshots"`);
  }
}
