import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTypeScoreIndex1740527000000 implements MigrationInterface {
  name = 'AddTypeScoreIndex1740527000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_hn_items_type_score" ON "hn_items" ("type", "score" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_hn_items_type_score"`);
  }
}
