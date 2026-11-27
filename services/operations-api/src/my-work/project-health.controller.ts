import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentCustomerId } from '../auth/current-customer.decorator';
import { ProjectHealthService } from './project-health.service';
import type { ProjectHealthResponse } from './my-work.types';

@Controller('project-health')
@UseGuards(AuthGuard)
export class ProjectHealthController {
  constructor(@Inject(ProjectHealthService) private readonly health: ProjectHealthService) {}

  // The person comes only from the verified token, never from path, query or body.
  @Get()
  get(@CurrentCustomerId() personId: string): Promise<ProjectHealthResponse> {
    return this.health.getProjectHealth(personId);
  }

  @Put('selection')
  select(
    @CurrentCustomerId() personId: string,
    @Body() body: { projectId?: unknown },
  ): Promise<ProjectHealthResponse> {
    if (typeof body?.projectId !== 'string' || body.projectId === '') {
      throw new BadRequestException('projectId is required');
    }
    return this.health.selectProject(personId, body.projectId);
  }
}
