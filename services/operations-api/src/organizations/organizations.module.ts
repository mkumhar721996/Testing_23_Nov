import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrganizationsController } from './organizations.controller';
import { ORGANIZATIONS_REPOSITORY } from './organizations.repository';
import { OrganizationsService } from './organizations.service';
import { PgOrganizationsRepository } from './pg-organizations.repository';

@Module({
  imports: [AuthModule],
  controllers: [OrganizationsController],
  providers: [
    OrganizationsService,
    { provide: ORGANIZATIONS_REPOSITORY, useClass: PgOrganizationsRepository },
  ],
})
export class OrganizationsModule {}
