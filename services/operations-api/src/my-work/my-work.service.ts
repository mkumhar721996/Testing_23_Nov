import { Inject, Injectable } from '@nestjs/common';
import { DEFECT_REPOSITORY, type DefectRepository } from './defect.repository';
import type { MyWorkResponse } from './my-work.types';

const LIST_LIMIT = 10;

@Injectable()
export class MyWorkService {
  constructor(@Inject(DEFECT_REPOSITORY) private readonly defects: DefectRepository) {}

  async getMyWork(personId: string): Promise<MyWorkResponse> {
    const [open, recent, projects] = await Promise.all([
      this.defects.findOpenAssigned(personId, LIST_LIMIT),
      this.defects.findRecentInProjects(personId, LIST_LIMIT),
      this.defects.findProjects(personId),
    ]);
    return {
      openDefects: open,
      recentlyUpdated: recent,
      hasAnyDefects: open.total > 0 || recent.length > 0,
      projects,
    };
  }
}
