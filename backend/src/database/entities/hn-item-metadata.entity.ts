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
  @JoinColumn()
  hnItem: HnItem;

  @Column({ type: 'text', nullable: true })
  tiny_description: string | null;

  @Column({ type: 'text', nullable: true })
  short_description: string | null;

  @Column({ type: 'text', nullable: true })
  image_url: string | null;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
