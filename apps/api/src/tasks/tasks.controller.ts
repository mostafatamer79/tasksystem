import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { TasksService } from './tasks.service';
import {
  CreateCommentDto,
  CreateTaskDto,
  QueryTasksDto,
  ReturnTaskDto,
  UpdateProgressDto,
  UpdateTaskDto,
} from './dto/task.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a task — MANUAL or BALANCED assignment (ADMIN only)' })
  @ApiResponse({ status: 201, description: 'Task created' })
  @ApiResponse({ status: 400, description: 'Invalid assignment or no active employees' })
  create(@Body() dto: CreateTaskDto, @CurrentUser() actor: AuthUser) {
    return this.tasks.create(dto, actor);
  }

  @Get()
  @ApiOperation({ summary: 'List tasks — admins see all; employees only their own' })
  @ApiResponse({ status: 200, description: 'Paginated task list' })
  findAll(@Query() query: QueryTasksDto, @CurrentUser() actor: AuthUser) {
    return this.tasks.findAll(query, actor);
  }

  @Get('my')
  @ApiOperation({ summary: 'List tasks assigned to the current user' })
  @ApiResponse({ status: 200, description: 'Paginated task list' })
  myTasks(@Query() query: QueryTasksDto, @CurrentUser() actor: AuthUser) {
    return this.tasks.findAll(query, { ...actor, role: Role.EMPLOYEE });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task details (employees: own tasks only)' })
  @ApiResponse({ status: 200, description: 'Task details' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.tasks.findOne(id, actor);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Full task edit (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Task updated' })
  @ApiResponse({ status: 403, description: 'Forbidden — ADMIN only' })
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @CurrentUser() actor: AuthUser) {
    return this.tasks.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a task (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Task deleted' })
  async remove(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    await this.tasks.remove(id, actor);
    return { message: 'Task deleted' };
  }

  @Patch(':id/progress')
  @ApiOperation({ summary: 'Update task progress 0–100 (assignee, while IN_PROGRESS)' })
  @ApiResponse({ status: 200, description: 'Progress updated' })
  @ApiResponse({ status: 400, description: 'Illegal progress update' })
  updateProgress(
    @Param('id') id: string,
    @Body() dto: UpdateProgressDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.tasks.updateProgress(id, dto.progress, actor);
  }

  @Post(':id/start')
  @HttpCode(200)
  @ApiOperation({ summary: 'Start work — TODO→IN_PROGRESS or RETURNED→IN_PROGRESS (employee)' })
  @ApiResponse({ status: 200, description: 'Task started' })
  @ApiResponse({ status: 400, description: 'Illegal transition' })
  startWork(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.tasks.startWork(id, actor);
  }

  @Post(':id/submit-testing')
  @HttpCode(200)
  @ApiOperation({ summary: 'Submit for testing — IN_PROGRESS→TESTING (employee)' })
  @ApiResponse({ status: 200, description: 'Submitted for testing' })
  @ApiResponse({ status: 400, description: 'Illegal transition' })
  submitTesting(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.tasks.submitTesting(id, actor);
  }

  @Post(':id/approve')
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Approve — TESTING→COMPLETED (ADMIN & MODERATOR)' })
  @ApiResponse({ status: 200, description: 'Task approved' })
  @ApiResponse({ status: 400, description: 'Illegal transition' })
  approve(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.tasks.approve(id, actor);
  }

  @Post(':id/publish')
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Publish — COMPLETED→PUBLISHED (ADMIN & MODERATOR)' })
  @ApiResponse({ status: 200, description: 'Task published' })
  @ApiResponse({ status: 400, description: 'Illegal transition' })
  publish(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.tasks.publish(id, actor);
  }

  @Post(':id/return')
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Return for rework — TESTING/COMPLETED→RETURNED (ADMIN & MODERATOR)' })
  @ApiResponse({ status: 200, description: 'Task returned' })
  @ApiResponse({ status: 400, description: 'Illegal transition' })
  returnTask(@Param('id') id: string, @Body() dto: ReturnTaskDto, @CurrentUser() actor: AuthUser) {
    return this.tasks.returnTask(id, dto, actor);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add a comment to a task (assignee or admin)' })
  @ApiResponse({ status: 201, description: 'Comment added' })
  addComment(@Param('id') id: string, @Body() dto: CreateCommentDto, @CurrentUser() actor: AuthUser) {
    return this.tasks.addComment(id, dto.body, actor);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'List task comments (assignee or admin)' })
  @ApiResponse({ status: 200, description: 'Comments list' })
  listComments(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.tasks.listComments(id, actor);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'List task status history (assignee or admin)' })
  @ApiResponse({ status: 200, description: 'History list' })
  listHistory(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.tasks.listHistory(id, actor);
  }
}
