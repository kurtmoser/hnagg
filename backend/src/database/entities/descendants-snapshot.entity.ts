import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { HnItem } from './hn-item.entity';

@Entity('descendants_snapshots')
export class DescendantsSnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'integer', name: 'item_id' })
  itemId: number;

  @Column({ type: 'integer' })
  descendants: number;

  @Index('IDX_descendants_snapshots_item_recorded', ['itemId', 'recordedAt'])
  @CreateDateColumn({ type: 'timestamp', name: 'recorded_at' })
  recordedAt: Date;

  @ManyToOne(() => HnItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item: HnItem;
}
