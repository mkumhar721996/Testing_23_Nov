import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AuthGuard } from '../auth/auth.guard';
import { ADMIN_ROLE } from '../auth/principal';
import type { Principal, RequestWithPrincipal } from '../auth/principal';
import { ExpenseCategoriesService } from './expense-categories.service';

@Controller('expense-categories')
@UseGuards(AuthGuard)
export class ExpenseCategoriesController {
  constructor(@Inject(ExpenseCategoriesService) private readonly service: ExpenseCategoriesService) {}

  @Get()
  async list(@Query('active') active: string | undefined, @Req() req: RequestWithPrincipal) {
    const categories = await this.service.list({ activeOnly: active === 'true' });
    return { categories, canManage: req.principal!.roles.includes(ADMIN_ROLE) };
  }

  @Post()
  @UseGuards(AdminGuard)
  add(@Body() body: { name?: unknown }, @Req() req: RequestWithPrincipal) {
    return this.service.add(body?.name as string, req.principal as Principal);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  rename(@Param('id') id: string, @Body() body: { name?: unknown }, @Req() req: RequestWithPrincipal) {
    return this.service.rename(id, body?.name as string, req.principal as Principal);
  }

  @Post(':id/retire')
  @UseGuards(AdminGuard)
  retire(@Param('id') id: string, @Req() req: RequestWithPrincipal) {
    return this.service.retire(id, req.principal as Principal);
  }
}
