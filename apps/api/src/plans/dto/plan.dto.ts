import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PlanStatus } from '@prisma/client';

export class CreatePlanTaskDto {
  @ApiProperty()
  @Type(() => Date)
  date!: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dayName?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  material?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isReady?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taskId?: string;
}

export class CreatePlanDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  teacherName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  periodStart?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  periodEnd?: Date;

  @ApiPropertyOptional({ type: [CreatePlanTaskDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreatePlanTaskDto)
  tasks?: CreatePlanTaskDto[];
}

export class UpdatePlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  teacherName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  periodStart?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  periodEnd?: Date;
}

export class UpdatePlanTaskDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  date?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  material?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isReady?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taskId?: string;
}

export class UpsertPlanTaskDto extends CreatePlanTaskDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;
}

export class ReturnPlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class QueryPlansDto extends PaginationDto {
  @ApiPropertyOptional({ enum: PlanStatus })
  @IsOptional()
  @IsEnum(PlanStatus)
  status?: PlanStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdById?: string;
}
