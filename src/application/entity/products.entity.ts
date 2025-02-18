import { IsString } from 'class-validator';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('products_ican')
export class ProductsIcanEntity {
  @PrimaryGeneratedColumn()
  id: string;

  @Column({ type: 'varchar',})
  @IsString()
  app_id: string;

  @Column({ type: 'varchar' })
  @IsString()
  product_id: string;

  @Column({ type: 'varchar' })
  @IsString()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  @IsString()
  amount: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updateAt: Date;
}
