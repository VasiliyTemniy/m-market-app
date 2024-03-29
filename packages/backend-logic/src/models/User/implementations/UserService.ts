import type {
  AuthResponse,
  UserDT,
  UserDTN,
  UserDTU,
  UserUniqueProperties,
  AdministrateUserBody,
  AddressDTN,
  AddressDT
} from '@m-market-app/models';
import type { IUserService, IUserRepo } from '../interfaces';
import type { ISessionService } from '../../Session';
import type { IAuthController } from '../../Auth';
import type { IAddressRepo } from '../../Address';
import type { ITransactionHandler } from '../../../utils';
import { AddressMapper } from '../../Address';
import { User } from '@m-market-app/models';
import {
  ApplicationError,
  AuthServiceError,
  BannedError,
  CredentialsError,
  DatabaseError,
  PasswordLengthError,
  ProhibitedError,
  UnknownError,
  logger
} from '@m-market-app/utils';
import { UserMapper } from '../infrastructure';
import { maxPasswordLen, minPasswordLen, possibleUserRights } from '@m-market-app/shared-constants';
import config from '../../../config.js';


export class UserService implements IUserService {
  constructor(
    readonly userRepo: IUserRepo,
    readonly addressRepo: IAddressRepo,
    readonly transactionHandler: ITransactionHandler,
    readonly sessionService: ISessionService,
    readonly authController: IAuthController
  ) {}

  async getAll(): Promise<UserDT[]> {
    const users = await this.userRepo.getAll();

    return users.map(user => UserMapper.domainToDT(user));
  }

  async getSome(limit: number, offset: number): Promise<UserDT[]> {
    const users = await this.userRepo.getSome(limit, offset);

    return users.map(user => UserMapper.domainToDT(user));
  }

  async getById(id: number): Promise<UserDT> {
    const user = await this.userRepo.getById(id);

    return UserMapper.domainToDT(user);
  }

  async getByScope(scope: string = 'defaultScope'): Promise<UserDT[]> {
    const users = await this.userRepo.getByScope(scope);

    return users.map(user => UserMapper.domainToDT(user));
  }

  async create(userDTN: UserDTN, userAgent: string): Promise<{ user: UserDT, auth: AuthResponse}> {
    if (
      userDTN.password === undefined
      ||
      !(minPasswordLen < userDTN.password.length && userDTN.password.length < maxPasswordLen)
    )
      throw new PasswordLengthError(`Password must be longer than ${minPasswordLen} and shorter than ${maxPasswordLen} symbols`);

    const savedUser = await this.userRepo.create(userDTN);

    const { user: authorizedUser, auth: userAuth }
      = await this.resolveAuthLookupHashConflict(savedUser, userDTN.password);

    if (!authorizedUser.rights)
      throw new ApplicationError('Failed to create user');

    await this.sessionService.create(authorizedUser.id, userAuth.token, userAgent, authorizedUser.rights);
    
    return {
      user: UserMapper.domainToDT(authorizedUser),
      auth: userAuth
    };
  }

  async update(userDTU: UserDTU, userAgent: string): Promise<{ user: UserDT, auth: AuthResponse}> {

    const foundUser = await this.userRepo.getById(userDTU.id);

    if (foundUser.phonenumber === config.SUPERADMIN_PHONENUMBER)
      throw new ProhibitedError('Attempt to alter superadmin');
    if (foundUser.rights === 'disabled')
      throw new ProhibitedError('Attempt to alter disabled user');
    if (!foundUser.lookupHash || !foundUser.rights)
      throw new ApplicationError('User data corrupt: lookupHash or rights are missing');

    const checkCredentials = await this.authController.verifyCredentials({
      lookupHash: foundUser.lookupHash,
      password: userDTU.password
    });

    if (!checkCredentials.success || checkCredentials.error !== '') {
      if (checkCredentials.error === 'invalid password')
        throw new CredentialsError('Invalid password');
      if (checkCredentials.error === 'lookupHash not found')
        throw new CredentialsError('User not found on auth server. Please, contact the admins to resolve this problem');
      throw new AuthServiceError(checkCredentials.error);
    }

    if (userDTU.newPassword)
      if (!(minPasswordLen < userDTU.newPassword.length && userDTU.newPassword.length < maxPasswordLen))
        throw new PasswordLengthError(`Password must be longer than ${minPasswordLen} and shorter than ${maxPasswordLen} symbols`);

    const updatedUser = await this.userRepo.update(UserMapper.dtToDomain(userDTU));

    if (!updatedUser.lookupHash || !updatedUser.rights)
      throw new ApplicationError('User data corrupt: lookupHash or rights are missing');

    // Does not need to resolve any lookupHash conflicts because they should not exist -
    // user must be already authorized to even get to this point
    const userAuth = await this.authController.update({
      id: updatedUser.id,
      lookupHash: updatedUser.lookupHash,
      oldPassword: userDTU.password,
      newPassword: userDTU.newPassword ? userDTU.newPassword : userDTU.password,
      ttl: config.TOKEN_TTL
    });

    await this.sessionService.update(updatedUser.id, userAuth.token, userAgent, updatedUser.rights);
    
    return {
      user: UserMapper.domainToDT(updatedUser),
      auth: userAuth
    };
  }

  async authenticate(
    password: string,
    credential: UserUniqueProperties,
    userAgent: string
  ): Promise<{ user: UserDT; auth: AuthResponse; }> {

    if (credential.phonenumber === config.SUPERADMIN_PHONENUMBER) throw new ProhibitedError('Superadmin must login only with a username');

    const whereClause = {} as UserUniqueProperties;
    if (credential.username) whereClause.username = credential.username;
    if (credential.phonenumber) whereClause.phonenumber = credential.phonenumber;
    if (credential.email) whereClause.email = credential.email;

    const user = await this.userRepo.getByUniqueProperties(whereClause);

    if (!user.lookupHash)
      throw new ApplicationError('User data corrupt: lookupHash is missing. Please, contact the admins to resolve this problem');
    if (!user.rights)
      throw new ApplicationError('User data corrupt: rights are missing. Please, contact the admins to resolve this problem');
    if (user.rights === 'disabled')
      throw new BannedError('Your account have been banned. Contact admin to unblock account');
    if (user.deletedAt)
      throw new ProhibitedError('You have deleted your own account. To delete it permanently or restore it, contact admin');

    const auth = await this.authController.grant({
      id: user.id,
      lookupHash: user.lookupHash,
      password,
      ttl: config.TOKEN_TTL
    });

    if (!auth.token || auth.error || auth.id !== user.id) {
      if (auth.error === 'invalid password')
        throw new CredentialsError('Invalid password');
      if (auth.error === 'lookupHash not found')
        throw new CredentialsError('User not found on auth server. Please, contact the admins to resolve this problem');
      throw new AuthServiceError(auth.error);
    }

    await this.sessionService.update(user.id, auth.token, userAgent, user.rights);

    return {
      user: UserMapper.domainToDT(user),
      auth
    };
  }

  async refreshToken(token: string, userAgent: string): Promise<AuthResponse> {

    const auth = await this.authController.refreshToken({
      token,
      ttl: config.TOKEN_TTL
    });

    if (!auth.token || auth.error || !auth.id) {
      throw new AuthServiceError(auth.error);
    }

    await this.sessionService.refresh(auth.id, auth.token, userAgent);

    return auth;
  }

  async logout(id: number, userAgent: string): Promise<void> {
    await this.sessionService.remove({ where: { userId: id, userAgent } });
  }

  async administrate(id: number, body: AdministrateUserBody): Promise<UserDT> {

    let userSubject = await this.userRepo.getById(id);

    if (userSubject.phonenumber === config.SUPERADMIN_PHONENUMBER)
      throw new ProhibitedError('Attempt to alter superadmin');

    if (body.restore) {
      userSubject = await this.restore(id);
    }

    if (body.rights) {
      if (possibleUserRights.includes(body.rights)) {

        const updUserRights = new User(
          id,
          userSubject.phonenumber,
          undefined,
          undefined,
          undefined,
          body.rights
        );

        userSubject = await this.userRepo.update(updUserRights);

        await this.sessionService.updateAllByUserId(id, body.rights);
      }

      if (userSubject.rights === 'disabled') {
        await this.sessionService.remove({ where: { userId: userSubject.id } });
      }
    }

    return UserMapper.domainToDT(userSubject);
  }

  /**
   * Mark user as deleted, add deletedAd timestamp.
   */
  async remove(id: number): Promise<UserDT> {
    await this.sessionService.remove({ where: { userId: id } });

    const deletedUser = await this.userRepo.remove(id);

    if (!deletedUser.lookupHash)
      throw new ApplicationError('User data corrupt: lookupHash is missing');

    await this.authController.remove({ lookupHash: deletedUser.lookupHash });

    return UserMapper.domainToDT(deletedUser);
  }

  private async restore(id: number): Promise<User> {
    return await this.userRepo.restore(id);
  }

  /**
   * Remove a user entry from the database entirely.
   */
  async delete(id: number): Promise<void> {
    const transaction = await this.transactionHandler.start();

    try {

      const user = await this.userRepo.getById(id, transaction);
      if (!user.lookupHash)
        throw new ApplicationError('User data corrupt: lookupHash is missing');
  
      await this.authController.remove({ lookupHash: user.lookupHash });
      await this.addressRepo.removeAddressesForOneUser(id, transaction);
      await this.userRepo.delete(id, transaction);

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  async removeAll(keepSuperAdmin: boolean = false): Promise<void> {
    if (process.env.NODE_ENV !== 'test') return;
    await this.userRepo.removeAll(keepSuperAdmin);
  }

  async initSuperAdmin(): Promise<void> {

    // Check for existing superadmin
    try {
      const existingUser = await this.userRepo.getByUniqueProperties({
        phonenumber: config.SUPERADMIN_PHONENUMBER
      });
      if (existingUser) {
  
        // Some paranoid checks
        if (
          existingUser.rights !== 'admin'
          ||
          existingUser.phonenumber !== config.SUPERADMIN_PHONENUMBER
        ) {
          await this.userRepo.remove(existingUser.id);
          await this.userRepo.delete(existingUser.id);
          await this.initSuperAdmin();
        }
        return;
      }
    } catch (e) {
      if (!(e instanceof DatabaseError)) {
        logger.shout('Could not update superadmin rights', e);
        process.exit(1);
      }
    }

    const superAdminPassword = process.env.SUPERADMIN_PASSWORD;
    if (!superAdminPassword) 
      throw new ApplicationError('Super admin password is not defined');

    const superAdminUsername = process.env.SUPERADMIN_USERNAME;
    if (!superAdminUsername) 
      throw new ApplicationError('Super admin username is not defined');

    // New superadmin creation
    const user = {
      username: superAdminUsername,
      phonenumber: config.SUPERADMIN_PHONENUMBER,
      password: superAdminPassword,
      rights: 'admin'
    };
  
    const savedSuperAdmin = await this.userRepo.create(user, true, 'admin');

    if (!savedSuperAdmin.lookupHash || !savedSuperAdmin.rights)
      throw new ApplicationError('Failed to create superadmin');

    await this.authController.create({
      id: savedSuperAdmin.id,
      lookupHash: savedSuperAdmin.lookupHash,
      password: superAdminPassword,
      ttl: config.TOKEN_TTL
    });
  
    process.env.SUPERADMIN_USERNAME = '';
    process.env.SUPERADMIN_PASSWORD = '';
  
    return logger.info('Super admin user successfully created!');
  }

  private async resolveAuthLookupHashConflict(
    user: User,
    password: string,
    tries: number = 0
  ): Promise<{ user: User; auth: AuthResponse; }> {

    if (tries > 5) throw new ApplicationError('Too many tries. This can happen once in an enormous amount of times. Interrupted to avoid data loss. Please, try again manually.');

    if (!user.lookupHash)
      throw new ApplicationError('User data corrupt: lookupHash is missing');
    
    const auth = await this.authController.create({
      id: user.id,
      lookupHash: user.lookupHash,
      password,
      ttl: config.TOKEN_TTL
    });

    if (!auth.token || auth.error || auth.id !== user.id) {
      if (auth.error === 'error creating credentials in db') {
        const userWithNewLookupHash = await this.userRepo.updateLookupHash(user, user.lookupNoise);
        return this.resolveAuthLookupHashConflict(userWithNewLookupHash, password, tries + 1);
      } else {
        throw new UnknownError(auth.error);
      }
    }

    return { user, auth };
  }

  async cleanSessionRepo(): Promise<void> {
    await this.sessionService.cleanRepo((req: { token: string }) => this.authController.verifyTokenInternal(req));
  }

  async createAddress(userId: number, address: AddressDTN): Promise<{ address: AddressDT, created: boolean }> {
    const transaction = await this.transactionHandler.start();

    try {
      const { address: savedAddress } = await this.addressRepo.findOrCreate(address, transaction);

      const { created } = await this.addressRepo.createUserAddress(userId, savedAddress.id, transaction);
  
      await transaction.commit();
      return { address: AddressMapper.domainToDT(savedAddress), created };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  async updateAddress(userId: number, address: AddressDT): Promise<{ address: AddressDT, updated: boolean }> {
    const transaction = await this.transactionHandler.start();

    try {

      // Last arg is `removeIfUnused` set to false here because userAddress is still not updated
      const { address: updatedAddress } = await this.addressRepo.update(AddressMapper.dtToDomain(address), transaction, false);

      const { updated } = await this.addressRepo.updateUserAddress(userId, updatedAddress.id, address.id, transaction);
  
      // Here, removeIfUnused is called only after updating UserAddress record
      await this.addressRepo.removeIfUnused(address.id, transaction);

      await transaction.commit();
      return { address: AddressMapper.domainToDT(updatedAddress), updated }; 
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  async removeAddress(userId: number, addressId: number): Promise<void> {
    await this.addressRepo.removeUserAddress(userId, addressId);
  }

  async getWithAddress(id: number): Promise<UserDT> {
    const user = await this.userRepo.getById(id);

    return UserMapper.domainToDT(user);
  }
}