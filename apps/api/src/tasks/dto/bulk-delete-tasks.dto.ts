import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '@prisma/client';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsUUID,
  Matches,
} from 'class-validator';

const ISO_DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class BulkDeleteTasksDto {
  @ApiPropertyOptional({ type: [String], description: 'Explicit task IDs to delete' })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID(undefined, { each: true })
  ids?: string[];

  @ApiPropertyOptional({ description: 'Delete every task matching the optional filters' })
  @IsOptional()
  @IsBoolean()
  all?: boolean;

  @ApiPropertyOptional({ deprecated: true, description: 'Legacy alias for all tasks with COMPLETED status' })
  @IsOptional()
  @IsBoolean()
  allCompleted?: boolean;

  @ApiPropertyOptional({ enum: TaskStatus, description: 'Omit to include every status' })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ example: '2026-09-01', description: 'Inclusive task creation date' })
  @IsOptional()
  @Matches(ISO_DATE_ONLY_PATTERN)
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-09-05', description: 'Inclusive task creation date' })
  @IsOptional()
  @Matches(ISO_DATE_ONLY_PATTERN)
  toDate?: string;

  @ApiPropertyOptional({ default: false, description: 'Exclude deleted tasks from archived dashboard totals' })
  @IsOptional()
  @IsBoolean()
  removeFromDashboard?: boolean;
}
