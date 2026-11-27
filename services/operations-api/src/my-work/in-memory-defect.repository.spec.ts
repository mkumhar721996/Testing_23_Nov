import { describeDefectRepository } from './defect.repository.contract';
import { InMemoryDefectRepository } from './in-memory-defect.repository';

describeDefectRepository('in-memory', async () => {
  const repo = new InMemoryDefectRepository();
  return { repo, seed: (data) => repo.seed(data) };
});
