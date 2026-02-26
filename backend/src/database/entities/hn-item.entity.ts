import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('hn_items')
export class HnItem {
  @PrimaryColumn({ type: 'integer' })
  id: number;

  @Index()
  @Column({ type: 'varchar', length: 10 })
  type: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  by: string | null;

  @Index()
  @Column({ type: 'timestamp' })
  time: Date;

  @Column({ type: 'text', nullable: true })
  url: string | null;

  @Column({ type: 'text', nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  text: string | null;

  @Index()
  @Column({ type: 'integer', nullable: true })
  score: number | null;

  @Column({ type: 'integer', nullable: true })
  descendants: number | null;

  @Column({ type: 'int', array: true, nullable: true })
  kids: number[] | null;

  @Column({ type: 'integer', nullable: true })
  parent: number | null;

  @Column({ type: 'int', array: true, nullable: true })
  parts: number[] | null;

  @Column({ type: 'integer', nullable: true })
  poll: number | null;

  @Column({ type: 'boolean', default: false })
  dead: boolean;

  @Column({ type: 'boolean', default: false })
  deleted: boolean;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'synced_at' })
  syncedAt: Date;
}
