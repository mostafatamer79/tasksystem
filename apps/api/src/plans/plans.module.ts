import { Module } from '@nestjs/common';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { PlanRepository } from './plan.repository';
import { PlanStateMachine } from './plan-state-machine';

@Module({
  controllers: [PlansController],
  providers: [PlansService, PlanRepository, PlanStateMachine],
})
export class PlansModule {}
