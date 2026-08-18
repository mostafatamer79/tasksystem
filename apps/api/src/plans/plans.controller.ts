import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { PlansService } from './plans.service';
import {
  CreatePlanDto,
  CreatePlanTaskDto,
  QueryPlansDto,
  ReturnPlanDto,
  UpdatePlanDto,
  UpdatePlanTaskDto,
  UpsertPlanTaskDto,
} from './dto/plan.dto';

@ApiTags('Plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new plan (Admin only)' })
  create(@Body() dto: CreatePlanDto, @CurrentUser() user: AuthUser) {
    return this.plansService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List plans (scoped by role)' })
  findAll(@Query() query: QueryPlansDto, @CurrentUser() user: AuthUser) {
    return this.plansService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get plan details' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.plansService.findOne(id, user);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update plan info (Admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdatePlanDto, @CurrentUser() user: AuthUser) {
    return this.plansService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a plan (Admin only)' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.plansService.remove(id, user);
  }

  @Post(':id/tasks')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Add a task to a plan (Admin only)' })
  addTask(@Param('id') id: string, @Body() dto: CreatePlanTaskDto, @CurrentUser() user: AuthUser) {
    return this.plansService.addTask(id, dto, user);
  }

  @Put(':id/tasks')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Bulk upsert tasks for a plan (Admin only)' })
  upsertTasks(
    @Param('id') id: string,
    @Body() dtos: UpsertPlanTaskDto[],
    @CurrentUser() user: AuthUser,
  ) {
    return this.plansService.upsertTasks(id, dtos, user);
  }

  @Patch(':id/tasks/:taskId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a specific plan task (Admin only)' })
  updateTask(
    @Param('id') planId: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdatePlanTaskDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.plansService.updateTask(planId, taskId, dto, user);
  }

  @Delete(':id/tasks/:taskId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Remove a specific plan task (Admin only)' })
  removeTask(
    @Param('id') planId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.plansService.removeTask(planId, taskId, user);
  }

  @Post(':id/submit')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Submit plan for review (Admin only)' })
  submit(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.plansService.submit(id, user);
  }

  @Post(':id/publish')
  @Roles('MODERATOR')
  @ApiOperation({ summary: 'Publish a plan (Moderator only)' })
  publish(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.plansService.publish(id, user);
  }

  @Post(':id/return')
  @Roles('MODERATOR')
  @ApiOperation({ summary: 'Return a plan for revision (Moderator only)' })
  returnPlan(@Param('id') id: string, @Body() dto: ReturnPlanDto, @CurrentUser() user: AuthUser) {
    return this.plansService.returnPlan(id, dto, user);
  }
}
