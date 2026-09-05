import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PlanStatus, Priority, Role } from '@prisma/client';

export class PlanNextTaskDefinitionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  assigneeRole?: Role;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  dueDays?: number;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresPublishing?: boolean;

  @ApiPropertyOptional({ enum: ['ON_SUCCESS', 'ON_RETURN'] })
  @IsOptional()
  @IsEnum(['ON_SUCCESS', 'ON_RETURN'] as const)
  condition?: 'ON_SUCCESS' | 'ON_RETURN';

  @ApiPropertyOptional({ type: () => [PlanNextTaskDefinitionDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PlanNextTaskDefinitionDto)
  nextTasks?: PlanNextTaskDefinitionDto[];
}

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

  @ApiPropertyOptional({ description: 'Stable built-in workflow template identifier' })
  @IsOptional()
  @IsString()
  workflowTemplateId?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAutomated?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nextTaskTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nextTaskDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nextTaskAssigneeId?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  nextTaskAssigneeRole?: Role;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  nextTaskDueDays?: number;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  nextTaskPriority?: Priority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresPublishing?: boolean;

  @ApiPropertyOptional({ type: [PlanNextTaskDefinitionDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PlanNextTaskDefinitionDto)
  nextTasks?: PlanNextTaskDefinitionDto[];

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

  @ApiPropertyOptional({ description: 'Stable built-in workflow template identifier' })
  @IsOptional()
  @IsString()
  workflowTemplateId?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAutomated?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nextTaskTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nextTaskDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nextTaskAssigneeId?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  nextTaskAssigneeRole?: Role;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  nextTaskDueDays?: number;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  nextTaskPriority?: Priority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresPublishing?: boolean;

  @ApiPropertyOptional({ type: [PlanNextTaskDefinitionDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PlanNextTaskDefinitionDto)
  nextTasks?: PlanNextTaskDefinitionDto[];

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
