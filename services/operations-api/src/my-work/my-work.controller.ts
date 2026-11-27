import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentCustomerId } from '../auth/current-customer.decorator';
import { MyWorkService } from './my-work.service';
import type { MyWorkResponse } from './my-work.types';

@Controller('my-work')
@UseGuards(AuthGuard)
export class MyWorkController {
  constructor(@Inject(MyWorkService) private readonly myWork: MyWorkService) {}

  // The person comes only from the verified token, never from path, query or body.
  @Get()
  getMyWork(@CurrentCustomerId() personId: string): Promise<MyWorkResponse> {
    return this.myWork.getMyWork(personId);
  }
}
