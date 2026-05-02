import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';
import { HnItem } from './hn-item.entity';

@Entity('hn_items_metadata')
export class HnItemMetadata {
  @PrimaryColumn({ type: 'integer' })
  id: number;

  @OneToOne(() => HnItem)
  @JoinColumn({ name: 'id' })
  hnItem: HnItem;

  @Column({ type: 'text', nullable: true })
  og_image: string | null;

  @Column({ type: 'text', nullable: true })
  og_description: string | null;

  @Column({ type: 'text', nullable: true })
  local_image_path: string | null;

  @Column({ type: 'text', nullable: true })
  favicon_url: string | null;

  @Column({ type: 'text', nullable: true })
  local_favicon_path: string | null;

  @Column({ type: 'text', nullable: true })
  tiny_description: string | null;

  @Column({ type: 'text', nullable: true })
  short_description: string | null;

  @Column({ type: 'text', nullable: true })
  image_url: string | null;

  @Column({ type: 'boolean', default: false })
  fetch_failed: boolean;

  @Column({ type: 'integer', default: 0 })
  fetch_attempt_count: number;

  @Column({ type: 'timestamp', nullable: true })
  last_fetch_attempted_at: Date | null;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
