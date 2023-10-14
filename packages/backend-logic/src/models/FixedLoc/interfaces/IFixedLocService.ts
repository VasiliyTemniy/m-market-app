import type { FixedLoc, FixedLocDT, FixedLocDTN, FixedLocDTS } from '@m-cafe-app/models';
import type { ICRUDService, IHasInmemRepoService } from '../../../utils';

export interface IFixedLocService extends ICRUDService<FixedLocDT, FixedLocDTN>, IHasInmemRepoService {
  getByScope(scope: string): Promise<FixedLocDT[]>;
  initFixedLocs(path: string, ext: 'jsonc' | 'json'): Promise<void>;
  reset(): Promise<FixedLocDT[]>;
  getFromInmem(scopes?: string[]): Promise<FixedLocDTS[]>;
  storeToInmem(fixedLocs: FixedLoc[]): Promise<void>;
}