import type { IUserControllerHttp, IUserService } from '../interfaces';
import type { Request, Response } from 'express';
import { isRequestWithUser, type RequestWithUserRights } from '../../../utils';
import { isUserDTN } from '@m-cafe-app/models';
import { HackError, RequestBodyError, RequestQueryError, UnknownError, hasOwnProperty, isAdministrateUserBody } from '@m-cafe-app/utils';


export class UserControllerExpressHttp implements IUserControllerHttp {
  constructor( readonly service: IUserService ) {}

  async getAll(req: Request, res: Response) {
    const users = await this.service.getAll();
    res.status(200).json(users);
  }

  async getSome(req: Request, res: Response) {

    let limit = 20;
    let offset = 0;

    if (req.query.limit) {
      if (isNaN(Number(req.query.limit))) throw new RequestQueryError('Incorrect query string');
      limit = Number(req.query.limit);
    }

    if (req.query.offset) {
      if (isNaN(Number(req.query.offset))) throw new RequestQueryError('Incorrect query string');
      offset = Number(req.query.offset);
    }

    const users = await this.service.getSome(limit, offset);
    res.status(200).json(users);
  }

  async getById(req: Request, res: Response) {
    const user = await this.service.getById(Number(req.params.id));
    res.status(200).json(user);
  }

  async getByScope(req: RequestWithUserRights, res: Response) {
    const scope = req.rights === 'admin'
      ? 'all'
      : 'nonFalsy';

    const users = await this.service.getByScope(scope);
    res.status(200).json(users);
  }

  async create(req: Request, res: Response) {
    if (!isUserDTN(req.body))
      throw new RequestBodyError('Invalid new user request body');
    if (hasOwnProperty(req.body, 'rights'))
      throw new HackError('Please do not try this');

    const { username, name, password, phonenumber, email, birthdate } = req.body;

    const savedUser = await this.service.create({
      username,
      name,
      password,
      phonenumber,
      email,
      birthdate
    });
    
    res.status(201).json(savedUser);
  }

  async update(req: Request, res: Response) {
    if (!isUserDTN(req.body))
      throw new RequestBodyError('Invalid edit user request body');

    // CHANGE THIS TO AUTH CHECK AFTER AUTH MODULE IS FINISHED
    if (!isRequestWithUser(req)) throw new UnknownError('This code should never be reached - check userExtractor middleware');
    if (req.userId !== Number(req.params.id)) throw new HackError('User attempts to change another users data or invalid user id');

    const { username, name, password, phonenumber, email, birthdate, newPassword } = req.body;

    const updatedUser = await this.service.update({
      id: Number(req.params.id),
      username,
      name,
      phonenumber,
      email,
      birthdate
    }, password, newPassword);
    
    res.status(200).json(updatedUser);
  }

  async administrate(req: Request, res: Response): Promise<void> {
    if (!isAdministrateUserBody(req.body)) throw new RequestBodyError('Invalid administrate user request body');

    const userSubject = await this.service.administrate(Number(req.params.id), req.body);

    res.status(200).json(userSubject);
  }

  async remove(req: Request, res: Response): Promise<void> {
    const deletedUser = await this.service.remove(Number(req.params.id));
    res.status(200).json(deletedUser);
  }

  async delete(req: Request, res: Response) {
    await this.service.delete(Number(req.params.id));
    res.status(204).end();
  }
}