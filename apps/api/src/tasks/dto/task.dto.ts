import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AssignmentMode, Priority, Role, TaskStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateTaskDto {
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
  description?: string;

  @ApiPropertyOptional({ enum: Priority, default: Priority.MEDIUM })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional({ description: 'ISO date string' })
  @IsOptional()
  @Type(() => Date)
  dueDate?: Date;

  @ApiPropertyOptional({ description: 'Required when assignmentMode is MANUAL' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiProperty({ enum: AssignmentMode, default: AssignmentMode.MANUAL })
  @IsEnum(AssignmentMode)
  assignmentMode: AssignmentMode = AssignmentMode.MANUAL;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  attachmentLink?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  isAutomated?: boolean;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  triggerStatus?: TaskStatus;

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
  @IsUUID()
  nextTaskAssigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nextTaskAssigneeRole?: any;

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
  requiresPublishing?: boolean;

  @ApiPropertyOptional({ description: 'Array of next-task definitions for parallel / conditional workflows' })
  @IsOptional()
  nextTasks?: NextTaskDefinitionDto[];

}

export class NextTaskDefinitionDto {
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

  @ApiPropertyOptional({ type: () => [NextTaskDefinitionDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => NextTaskDefinitionDto)
  nextTasks?: NextTaskDefinitionDto[];
}

export class UpdateTaskDto {
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
  description?: string;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  dueDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  attachmentLink?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualHours?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;

  @ApiPropertyOptional()
  @IsOptional()
  isAutomated?: boolean;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  triggerStatus?: TaskStatus;

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
  @IsUUID()
  nextTaskAssigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nextTaskAssigneeRole?: any;

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
  requiresPublishing?: boolean;

  @ApiPropertyOptional({ description: 'Array of next-task definitions for parallel / conditional workflows' })
  @IsOptional()
  nextTasks?: NextTaskDefinitionDto[];

}

export class UpdateProgressDto {
  @ApiProperty({ minimum: 0, maximum: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  progress!: number;
}

export class ReturnTaskDto {
  @ApiPropertyOptional({ description: 'Reason for returning the task' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateCommentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body!: string;
}

export class QueryTasksDto extends PaginationDto {
  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}
