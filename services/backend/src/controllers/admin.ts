import { Router, RequestHandler } from 'express';
import { DatabaseError, hasOwnProperty, ProhibitedError, RequestBodyError } from '@m-cafe-app/utils';
import { isAdministrateUserBody } from '@m-cafe-app/utils';
import middleware from '../utils/middleware.js';
import { User, Session } from '../models/index.js';
import config from '../utils/config.js';

const adminRouter = Router();

adminRouter.get(
  '/users/',
  middleware.verifyToken,
  middleware.adminCheck,
  middleware.sessionCheck,
  (async (req, res) => {

    const userSubjects = await User.scope('all').findAll({
      attributes: { exclude: ['passwordHash'] }
    });

    res.status(200).json(userSubjects);

  }) as RequestHandler
);

adminRouter.get(
  '/users/:id',
  middleware.verifyToken,
  middleware.adminCheck,
  middleware.sessionCheck,
  (async (req, res) => {

    const userSubject = await User.scope('all').findByPk(req.params.id, {
      attributes: { exclude: ['passwordHash'] }
    });

    if (!userSubject) throw new DatabaseError(`No user entry with this id ${req.params.id}`);

    res.status(200).json(userSubject);

  }) as RequestHandler
);

adminRouter.put(
  '/users/:id',
  middleware.verifyToken,
  middleware.adminCheck,
  middleware.sessionCheck,
  (async (req, res) => {

    if (!isAdministrateUserBody(req.body)) throw new RequestBodyError('Invalid administrate user request body');

    const userSubject = await User.scope('all').findByPk(req.params.id);

    if (!userSubject) throw new DatabaseError(`No user entry with this id ${req.params.id}`);
    if (userSubject.phonenumber === config.SUPERADMIN_PHONENUMBER)
      throw new ProhibitedError('Attempt to alter superadmin');

    if (hasOwnProperty(req.body, 'disabled')) {
      userSubject.disabled = req.body.disabled;

      if (userSubject.disabled) {
        await Session.destroy({
          where: {
            userId: userSubject.id,
          }
        });
      }
    }

    if (hasOwnProperty(req.body, 'admin')) {
      userSubject.admin = req.body.admin;
    }

    await userSubject.save();

    res.status(200).json(userSubject);

  }) as RequestHandler
);

adminRouter.delete(
  '/users/:id',
  middleware.verifyToken,
  middleware.adminCheck,
  middleware.sessionCheck,
  (async (req, res) => {

    const userSubject = await User.scope('all').findByPk(req.params.id);

    if (!userSubject) throw new DatabaseError(`No user entry with this id ${req.params.id}`);

    await userSubject.destroy({ force: true });

    res.status(204).end();

  }) as RequestHandler
);

export default adminRouter;