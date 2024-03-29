import type { IFixedLocControllerHttp, IFixedLocService } from '../interfaces';
import type { Request, Response } from 'express';
import type { FixedLocDT, FixedLocDTS } from '@m-market-app/models';
import { isRequestWithUserRights } from '../../../utils';
import { isFixedLocDT, isFixedLocDTMany } from '@m-market-app/models';
import { ApplicationError, RequestBodyError, UnknownError, isString } from '@m-market-app/utils';


export class FixedLocControllerExpressHttp implements IFixedLocControllerHttp {
  constructor( readonly service: IFixedLocService ) {}

  async getAll(req: Request, res: Response): Promise<void> {
    const fixedLocs: FixedLocDT[] = await this.service.getAll();
    res.status(200).json(fixedLocs);
  }

  async getById(req: Request, res: Response): Promise<void> {
    const fixedLoc: FixedLocDT = await this.service.getById(Number(req.params.id));
    res.status(200).json(fixedLoc);
  }

  async getByScope(req: Request, res: Response): Promise<void> {
    if (!isRequestWithUserRights(req)) throw new UnknownError('This code should never be reached - check verifyToken middleware');

    if (req.rights === 'admin') {
      let scope = 'all';

      if (isString(req.query.scope)) scope = req.query.scope;

      // Scope here is DB scope
      const fixedLocs: FixedLocDT[] = await this.service.getByScope(scope);
      res.status(200).json(fixedLocs);
    } else {
      let scopes: string[] = [];

      if (req.rights === 'customer') scopes = ['customer', 'shared'];
      else if (req.rights === 'manager') scopes = ['manager', 'staff', 'shared'];

      // Scopes here are fixed locs property scopes
      const fixedLocs: FixedLocDTS[] = await this.service.getFromInmem(scopes);
      res.status(200).json(fixedLocs);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    if (!isFixedLocDT(req.body))
      throw new RequestBodyError('Invalid edit fixed loc request body');

    const { name, namespace, scope, locString } = req.body;

    const updatedFixedLoc: FixedLocDT = await this.service.update({
      id: Number(req.params.id),
      name,
      namespace,
      scope,
      locString
    });
    
    res.status(200).json(updatedFixedLoc);
  }

  async updateMany(req: Request, res: Response): Promise<void> {
    if (!isFixedLocDTMany(req.body))
      throw new RequestBodyError('Invalid edit many fixed locs request body');

    const updFixedLocs = req.body;

    if (!this.service.updateMany)
      throw new ApplicationError(`Update many method not implemented for service ${this.service.constructor.name}`);

    const updatedFixedLocs: FixedLocDT[] = await this.service.updateMany(updFixedLocs);
    if (!updatedFixedLocs) throw new ApplicationError('Could not update fixed locs, check service implementation');

    res.status(200).json(updatedFixedLocs);
  }

  async reset(req: Request, res: Response): Promise<void> {
    const resettedFixedLocs: FixedLocDT[] = await this.service.reset();

    res.status(200).json(resettedFixedLocs);
  }
}