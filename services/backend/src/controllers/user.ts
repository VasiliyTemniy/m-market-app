import bcryptjs from 'bcryptjs';
import { RequestHandler, Router } from 'express';
import {
  CredentialsError,
  DatabaseError,
  HackError,
  PasswordLengthError,
  RequestBodyError,
  UnknownError,
  isEditUserBody,
  isNewUserBody
} from '@m-cafe-app/utils';
import { isCustomRequest } from '../types/RequestCustom.js';
import middleware from '../utils/middleware.js';
import { User } from '../models/index.js';

const usersRouter = Router();

usersRouter.post(
  '/',
  (async (req, res) => {

    if (!isNewUserBody(req.body)) throw new RequestBodyError('Invalid new user request body');
    if (Object.prototype.hasOwnProperty.call(req.body, "admin")) throw new HackError('Please do not try this');

    const { username, name, password, phonenumber, email, birthdate } = req.body;

    if (password === undefined || password.length <= 5) throw new PasswordLengthError('Password must be longer than 5 symbols');

    const saltRounds = 10;
    const passwordHash = await bcryptjs.hash(password, saltRounds);

    const user = {
      username,
      name,
      passwordHash,
      phonenumber,
      email,
      birthdate: birthdate ? new Date(birthdate) : undefined
    };

    const savedUser = await User.create(user);

    res.status(201).json(savedUser);

  }) as RequestHandler
);

usersRouter.put(
  '/:id',
  middleware.verifyToken,
  middleware.sessionCheck,
  (async (req, res) => {

    if (!isCustomRequest(req)) throw new UnknownError('This code should never be reached');
    if (!isEditUserBody(req.body)) throw new RequestBodyError('Invalid edit user request body');
    if (req.userId !== Number(req.params.id)) throw new HackError('User attempts to change another users data or invalid user id');

    const { username, name, password, phonenumber, email, birthdate, newPassword } = req.body;

    const user = await User.findByPk(req.params.id);

    if (!user) throw new UnknownError('This should never be reached');

    const passwordCorrect = await bcryptjs.compare(password, user.passwordHash);

    if (!passwordCorrect) throw new CredentialsError('Password incorrect');

    if (username) user.username = username;
    if (name) user.name = name;
    if (phonenumber) user.phonenumber = phonenumber;
    if (email) user.email = email;
    if (birthdate) user.birthdate = new Date(birthdate);
    if (newPassword) {
      if (newPassword.length <= 3) throw new PasswordLengthError('Password must be longer than 3 symbols');
      const saltRounds = 10;
      user.passwordHash = await bcryptjs.hash(newPassword, saltRounds);
    }

    await user.save();

    res.status(200).json(user);

  }) as RequestHandler
);

usersRouter.get(
  '/me',
  middleware.verifyToken,
  middleware.sessionCheck,
  (async (req, res) => {

    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['createdAt', 'updatedAt', 'passwordHash', 'disabled', 'admin'] }
    });

    if (!user) throw new DatabaseError('No user entry');

    res.status(200).json(user);

  }) as RequestHandler
);

export default usersRouter;