import { Controller, Get } from '@nestjs/common';
import { CurrentPrincipal } from '../auth/auth.guard';
import type { Principal } from '../auth/principal';

@Controller('me')
export class MeController {
  @Get()
  me(@CurrentPrincipal() p: Principal) {
    return { employeeId: p.employeeId, displayName: p.displayName, role: p.role };
  }
}
