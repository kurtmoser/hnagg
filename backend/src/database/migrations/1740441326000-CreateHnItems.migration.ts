import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHnItems1740441326000 implements MigrationInterface {
  name = 'CreateHnItems1740441326000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "hn_items" (
        "id"          integer NOT NULL,
        "type"        character varying(10) NOT NULL,
        "by"          character varying(255),
        "time"        TIMESTAMP NOT NULL,
        "url"         text,
        "title"       text,
        "text"        text,
        "score"       integer,
        "descendants" integer,
        "kids"        integer[],
        "parent"      integer,
        "parts"       integer[],
        "poll"        integer,
        "dead"        boolean NOT NULL DEFAULT false,
        "deleted"     boolean NOT NULL DEFAULT false,
        "created_at"  TIMESTAMP NOT NULL DEFAULT now(),
        "synced_at"   TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_hn_items" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_hn_items_type" ON "hn_items" ("type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_hn_items_time" ON "hn_items" ("time")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_hn_items_score" ON "hn_items" ("score")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_hn_items_score"`);
    await queryRunner.query(`DROP INDEX "IDX_hn_items_time"`);
    await queryRunner.query(`DROP INDEX "IDX_hn_items_type"`);
    await queryRunner.query(`DROP TABLE "hn_items"`);
  }
}
