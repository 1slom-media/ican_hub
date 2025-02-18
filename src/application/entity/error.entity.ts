import { IsString } from 'class-validator';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('errors_table')
export class ErrorIcanEntity {
  @PrimaryGeneratedColumn()
  id: string;

  @Column({ type: 'varchar' })
  @IsString()
  b_status: string;

  @Column({ type: 'varchar' })
  @IsString()
  b_state: string;

  @Column({ type: 'varchar' })
  @IsString()
  description: string;

  @Column({ type: 'varchar' })
  @IsString()
  state: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updateAt: Date;
}
