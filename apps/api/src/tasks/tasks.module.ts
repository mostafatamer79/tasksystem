import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskRepository } from './task.repository';
import { TaskStateMachine } from './state-machine/task-state-machine';
import { ManualAssignmentStrategy } from './strategies/manual.strategy';
import { BalancedAssignmentStrategy } from './strategies/balanced.strategy';

@Module({
  controllers: [TasksController],
  providers: [
    TasksService,
    TaskRepository,
    TaskStateMachine,
    ManualAssignmentStrategy,
    BalancedAssignmentStrategy,
  ],
})
export class TasksModule {}
