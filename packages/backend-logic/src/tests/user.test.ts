import type { AuthDTRequest, UserDTU } from '@m-market-app/models';
import { expect } from 'chai';
import 'mocha';
import { UserRepoSequelizePG, UserService } from '../models/User';
import { SessionRepoRedis, SessionService } from '../models/Session';
import { AddressRepoSequelizePG } from '../models/Address';
import { AuthController, AuthServiceInternal } from '../models/Auth';
import { dbHandler } from '@m-market-app/db';
import { initialUsers, newUserInfo } from './user_helper';
import { toOptionalDate, toOptionalISOString } from '@m-market-app/utils';
import { User as UserPG } from '@m-market-app/db';
import sha1 from 'sha1';
import { AuthConnectionHandler } from '../models/Auth';
import config, { redisSessionClient } from '../config';
import { TransactionHandlerSequelizePG } from '../utils';



// No mocking, no unit testing for this package. Only integration tests ->
// If tests fail after dependency injection, change dependencies accordingly
// in these tests

describe('UserService implementation tests', () => {

  let userService: UserService;

  before(async () => {
    await dbHandler.pingDb();

    userService = new UserService(
      new UserRepoSequelizePG(),
      new AddressRepoSequelizePG(),
      new TransactionHandlerSequelizePG(
        dbHandler
      ),
      new SessionService(
        new SessionRepoRedis(redisSessionClient)
      ),
      new AuthController(
        new AuthConnectionHandler(
          config.authUrl,
          config.authGrpcCredentials,
        ),
        new AuthServiceInternal()
      )
    );

    await userService.sessionService.connectInmem();
    await userService.sessionService.pingInmem();
    await userService.authController.connect();
    await userService.authController.ping();
    await userService.authController.getPublicKey();
  });
  
  beforeEach(async () => {
    await userService.authController.flushExternalDB();
    await userService.removeAll();
    await userService.sessionService.removeAll();
  });
  
  it('should create user', async () => {
    const { user, auth } = await userService.create(newUserInfo, 'test');

    expect(user.email).to.equal('test@test.test');
    expect(user.username).to.equal('test');
    expect(user.phonenumber).to.equal('8988123456');

    expect(auth.id).to.equal(user.id);
    expect(auth.token).to.exist;
    expect(auth.token).to.not.equal('');
    expect(auth.error).to.equal('');
  });

  it('should prevent creation of user with duplicate unique properties', async () => {
    await userService.create(newUserInfo, 'test');

    try {
      const newUserDoublerUsername = {
        ...newUserInfo,
        phonenumber: '89881234561', // not the same as newUserInfo.phonenumber
        email: 'newTest@test.test', // not the same as newUserInfo.email
      };

      await userService.create(newUserDoublerUsername, 'test');
    } catch (e) {
      if (!(e instanceof Error)) return expect(true).to.equal(false);
      expect(e.name).to.equal('SequelizeUniqueConstraintError');
    }

    try {
      const newUserDoublerEmail = {
        ...newUserInfo,
        phonenumber: '89881234561', // not the same as newUserInfo.phonenumber
        username: 'newTest', // not the same as newUserInfo.username
      };

      await userService.create(newUserDoublerEmail, 'test');
    } catch (e) {
      if (!(e instanceof Error)) return expect(true).to.equal(false);
      expect(e.name).to.equal('SequelizeUniqueConstraintError');
    }

    try {
      const newUserDoublerPhonenumber = {
        ...newUserInfo,
        email: 'newTest@test.test', // not the same as newUserInfo.email
        username: 'newTest', // not the same as newUserInfo.username
      };

      await userService.create(newUserDoublerPhonenumber, 'test');
    } catch (e) {
      if (!(e instanceof Error)) return expect(true).to.equal(false);
      expect(e.name).to.equal('SequelizeUniqueConstraintError');
    }
  });

  it('should resolve lookupHash doubling problems if ever occured in the app', async () => {
    const somehowAlreadyCreatedUser = await UserPG.create({
      phonenumber: '1231231231', // definitely not the same as newUserInfo.phonenumber
      birthdate: toOptionalDate(newUserInfo.birthdate),
      lookupHash: sha1( // Must be the same as newUserInfo.lookupHash
        newUserInfo.phonenumber +
        newUserInfo.username +
        newUserInfo.email +
        0 // lookupNoise
      ),
      lookupNoise: 0 // Must be zero by default in DB, but to make sure
    });

    // Must resolve lookupHash doubling problems
    const { user: anotherSomehowSameLookupHashUserInfo, auth } = await userService.create(newUserInfo, 'test');

    expect(auth.id).to.equal(anotherSomehowSameLookupHashUserInfo.id);

    const foundInDBToCheckLookupHash = await userService.userRepo.getById(anotherSomehowSameLookupHashUserInfo.id);

    expect(anotherSomehowSameLookupHashUserInfo.id).to.not.equal(somehowAlreadyCreatedUser.id);
    expect(foundInDBToCheckLookupHash.lookupHash).to.not.equal(somehowAlreadyCreatedUser.lookupHash);
    expect(foundInDBToCheckLookupHash.lookupNoise).to.not.equal(somehowAlreadyCreatedUser.lookupNoise);
    expect(somehowAlreadyCreatedUser.lookupNoise).to.equal(0);
    expect(foundInDBToCheckLookupHash.lookupNoise).to.not.equal(0);

    // Both users must persist in DB
    const users = await userService.userRepo.getAll();

    expect(users.length).to.equal(2);
  });

  it('should authenticate user with correct password provided', async () => {
    const { user } = await userService.create(newUserInfo, 'test');

    const { auth } = await userService.authenticate(newUserInfo.password, { phonenumber: user.phonenumber, email: user.email }, 'test');

    expect(auth.id).to.equal(user.id);
    expect(auth.token).to.exist;
    expect(auth.token).to.not.equal('');
    expect(auth.error).to.equal('');
  });

  it('should prevent authentication for user with incorrect password provided', async () => {
    const { user } = await userService.create(newUserInfo, 'test');

    try {
      await userService.authenticate('wrongPassword', { phonenumber: user.phonenumber, email: user.email }, 'test');
    } catch (e) {
      if (!(e instanceof Error)) return expect(true).to.equal(false);
      expect(e.name).to.equal('CredentialsError');
      expect(e.message).to.equal('Invalid password');
    }
  });

  it('should update user', async () => {

    const { user } = await userService.create(newUserInfo, 'test');

    const userInfoToUpdate: UserDTU = {
      id: user.id,
      phonenumber: user.phonenumber,
      username: user.username,
      name: 'updatedName',
      email: 'newTest@test.test',
      birthdate: user.birthdate,
      password: newUserInfo.password
    };

    const { user: updatedUser, auth } = await userService.update(userInfoToUpdate, 'test');

    expect(updatedUser.email).to.equal('newTest@test.test');
    expect(updatedUser.name).to.equal('updatedName');
    expect(updatedUser.phonenumber).to.equal(user.phonenumber);

    expect(auth.id).to.equal(user.id);
    expect(auth.token).to.exist;
    expect(auth.token).to.not.equal('');
    expect(auth.error).to.equal('');

  });

  it('should update user password', async () => {

    const { user } = await userService.create(newUserInfo, 'test');

    const userInfoToUpdate: UserDTU = {
      id: user.id,
      phonenumber: user.phonenumber,
      username: user.username,
      name: 'updatedName',
      email: 'newTest@test.test',
      birthdate: user.birthdate,
      password: newUserInfo.password,
      newPassword: 'updatedPassword123'
    };

    const { user: updatedUser, auth } = await userService.update(userInfoToUpdate, 'test');

    expect(updatedUser.email).to.equal('newTest@test.test');
    expect(updatedUser.name).to.equal('updatedName');
    expect(updatedUser.phonenumber).to.equal(user.phonenumber);

    expect(auth.id).to.equal(user.id);
    expect(auth.token).to.exist;
    expect(auth.token).to.not.equal('');
    expect(auth.error).to.equal('');
  });

  it('should prevent user update with incorrect password', async () => {

    const { user } = await userService.create(newUserInfo, 'test');

    const userInfoToUpdate: UserDTU = {
      id: user.id,
      phonenumber: user.phonenumber,
      username: user.username,
      name: 'updatedName',
      email: 'newTest@test.test',
      birthdate: user.birthdate,
      password: 'wrongPassword',
      newPassword: 'updatedPassword123'
    };

    try {
      await userService.update(userInfoToUpdate, 'test');
    } catch (e) {
      if (!(e instanceof Error)) return expect(true).to.equal(false);
      expect(e.name).to.equal('CredentialsError');
      expect(e.message).to.equal('Invalid password');
    }
  });

  it('should not authenticate or provide access to user update if no lookupHash was found on auth microservice', async () => {

    const user = await userService.userRepo.create(newUserInfo);

    try {
      await userService.authenticate(newUserInfo.password, { phonenumber: newUserInfo.phonenumber, email: newUserInfo.email }, 'test');
    } catch (e) {
      if (!(e instanceof Error)) return expect(true).to.equal(false);
      expect(e.name).to.equal('CredentialsError');
      expect(e.message).to.equal('User not found on auth server. Please, contact the admins to resolve this problem');
    }

    try {
      const userInfoToUpdate: UserDTU = {
        id: user.id,
        phonenumber: user.phonenumber,
        username: user.username,
        name: 'updatedName',
        email: 'newTest@test.test',
        birthdate: toOptionalISOString(user.birthdate),
        password: 'wrongPassword',
        newPassword: 'updatedPassword123'
      };

      await userService.update(userInfoToUpdate, 'test');
    } catch (e) {
      if (!(e instanceof Error)) return expect(true).to.equal(false);
      expect(e.name).to.equal('CredentialsError');
      expect(e.message).to.equal('User not found on auth server. Please, contact the admins to resolve this problem');
    }

  });

  it(`should delete user. If user was not removed, he does not get deleted. \
After deletion, user's credentials are removed from auth server`, async () => {

    const { user } = await userService.create(newUserInfo, 'test');
    const userInDb = await userService.userRepo.getById(user.id);
    if (!userInDb.lookupHash) return expect(true).to.equal(false);

    try {
      await userService.delete(user.id);
    } catch (e) {
      if (!(e instanceof Error)) return expect(true).to.equal(false);
      expect(e.name).to.equal('ProhibitedError');
      expect(e.message).to.equal('Only voluntarily deleted users can be fully removed by admins');
    }

    await userService.remove(user.id);

    const userAfterRemoval = await userService.getById(user.id);

    expect(userAfterRemoval.deletedAt).to.exist;

    await userService.delete(user.id);

    try {
      await userService.getById(user.id);
    } catch (e) {
      if (!(e instanceof Error)) return expect(true).to.equal(false);
      expect(e.name).to.equal('DatabaseError');
      expect(e.message).to.equal(`No user entry with this id ${user.id}`);
    }

    const authResponse = await userService.authController.verifyCredentials({
      lookupHash: userInDb.lookupHash, password: newUserInfo.password
    });

    expect(authResponse.success).to.equal(false);
    expect(authResponse.error).to.equal('lookupHash not found');

  });

  it('should restore user', async () => {
    
    const { user } = await userService.create(newUserInfo, 'test');

    await userService.remove(user.id);

    await userService.administrate(user.id, { restore: true });

    const userAfterRestoration = await userService.getById(user.id);

    expect(userAfterRestoration.deletedAt).to.not.exist;
  });

  it('should get all users, get some users, get users by scope', async () => {
    
    for (const newUser of initialUsers) {
      await userService.create(newUser, 'test');
    }

    const users = await userService.getAll();

    expect(users.length).to.equal(initialUsers.length);

    const someUsers = await userService.getSome(3, 5);

    expect(someUsers.length).to.equal(3);
    expect(someUsers[0].username).to.equal(initialUsers[5].username);

    const userWithAdminRights = await userService.administrate(users[0].id, { rights: 'admin' });
    const userWithManagerRights = await userService.administrate(users[1].id, { rights: 'manager' });
    const disabledUser = await userService.administrate(users[2].id, { rights: 'disabled' });
    const deletedUser = await userService.remove(users[3].id);

    const customers = await userService.getByScope('customer');

    expect(customers.length).to.equal(users.length - 4);

    const admins = await userService.getByScope('admin');

    expect(admins.length).to.equal(1);
    expect(admins[0].phonenumber).to.equal(userWithAdminRights.phonenumber);

    const managers = await userService.getByScope('manager');

    expect(managers.length).to.equal(1);
    expect(managers[0].phonenumber).to.equal(userWithManagerRights.phonenumber);

    const disabledUsers = await userService.getByScope('disabled');

    expect(disabledUsers.length).to.equal(1);
    expect(disabledUsers[0].phonenumber).to.equal(disabledUser.phonenumber);

    const deletedUsers = await userService.getByScope('deleted');

    expect(deletedUsers.length).to.equal(1);
    expect(deletedUsers[0].phonenumber).to.equal(deletedUser.phonenumber);

    const allWithTimestamps = await userService.getByScope('allWithTimestamps');

    expect(allWithTimestamps.length).to.equal(users.length);
    expect(allWithTimestamps[0].createdAt).to.exist;

  });

  it('should verify tokens both internally and on auth server', async () => {
    
    const { auth } = await userService.create(newUserInfo, 'test');

    const authResponse = await userService.authController.verifyToken({ token: auth.token });

    expect(authResponse.id).to.equal(auth.id);
    expect(authResponse.token).to.equal(auth.token);
    expect(authResponse.error).to.equal('');

    const internalAuthResponse = userService.authController.verifyTokenInternal({ token: auth.token });

    expect(internalAuthResponse.id).to.equal(auth.id);
    expect(internalAuthResponse.token).to.equal(auth.token);
    expect(internalAuthResponse.error).to.equal('');

  });

  it('should fail verification if token is invalid both internally and on auth server', async () => {
    
    const token = 'TotallyInvalidToken';

    const authResponse = await userService.authController.verifyToken({ token });

    expect(authResponse.id).to.equal(0);
    expect(authResponse.token).to.equal('');
    expect(authResponse.error).to.equal('invalid token or signature');

    const internalAuthResponse = userService.authController.verifyTokenInternal({ token });

    expect(internalAuthResponse.id).to.equal(0);
    expect(internalAuthResponse.token).to.equal('');
    expect(internalAuthResponse.error).to.equal('AuthorizationError: jwt malformed');

  });

  it('should refresh tokens', async () => {

    const { auth } = await userService.create(newUserInfo, 'test');

    const authResponse = await userService.authController.refreshToken({ token: auth.token, ttl: '3600s' });

    expect(authResponse.id).to.equal(auth.id);
    expect(authResponse.token).to.not.equal(auth.token);
    expect(authResponse.error).to.equal('');

  });

  it('should get public key', async () => {
    try {
      await userService.authController.getPublicKey();
    } catch (e) {
      expect(e).to.not.exist;
    }
  });

  it('should create superadmin', async () => {

    await userService.initSuperAdmin();

    const foundSuperAdmin = await userService.userRepo.getByUniqueProperties({ phonenumber: config.SUPERADMIN_PHONENUMBER });

    expect(foundSuperAdmin).to.exist;

    expect(process.env.SUPERADMIN_USERNAME).to.equal('');
    expect(process.env.SUPERADMIN_PASSWORD).to.equal('');

    process.env.SUPERADMIN_USERNAME = 'MOCKityMOCK';
    process.env.SUPERADMIN_PASSWORD = 'MOCKityMOCK';

    try {
      await userService.initSuperAdmin();
    } catch (e) {
      console.log(e);
      expect(e).to.not.exist;
    }

  });

  it('should store correct Session information', async () => {

    const { auth } = await userService.create(newUserInfo, 'test');

    const userIdFromToken = userService.authController.verifyTokenInternal({ token: auth.token }).id;

    const session = await userService.sessionService.getOne(userIdFromToken, 'test');
    if (!session) return expect(true).to.equal(false);

    expect(session.token).to.equal(auth.token);
    expect(session.userId).to.equal(userIdFromToken);
    expect(session.userAgentHash).to.equal(sha1('test'));
    expect(session.rights).to.equal('customer');

  });

  it('should update Session information upon login / authentication or user update', async () => {

    const { user, auth } = await userService.create(newUserInfo, 'test');

    const userIdFromToken = userService.authController.verifyTokenInternal({ token: auth.token }).id;

    const session = await userService.sessionService.getOne(userIdFromToken, 'test');
    if (!session) return expect(true).to.equal(false);


    await userService.authenticate(newUserInfo.password, { phonenumber: user.phonenumber, email: user.email }, 'test');

    const newSession = await userService.sessionService.getOne(userIdFromToken, 'test');
    if (!newSession) return expect(true).to.equal(false);

    expect(newSession.token).to.not.equal(session.token);
    expect(newSession.userId).to.equal(userIdFromToken);
    expect(newSession.userId).to.equal(session.userId);
    expect(newSession.userAgentHash).to.equal(sha1('test'));
    expect(newSession.rights).to.equal('customer');

    const userInfoToUpdate: UserDTU = {
      id: user.id,
      phonenumber: user.phonenumber,
      username: user.username,
      name: 'updatedName',
      email: 'newTest@test.test',
      password: newUserInfo.password,
      newPassword: 'updatedPassword123'
    };

    const { user: updatedUser } = await userService.update(userInfoToUpdate, 'test');

    const updSession = await userService.sessionService.getOne(userIdFromToken, 'test');
    if (!updSession) return expect(true).to.equal(false);

    expect(updatedUser.name).to.equal('updatedName');
    expect(updSession.userId).to.equal(userIdFromToken);
    expect(updSession.userId).to.equal(session.userId);
    expect(updSession.userAgentHash).to.equal(sha1('test'));
    expect(updSession.rights).to.equal('customer');
    expect(updSession.token).to.not.equal(session.token);
    expect(updSession.token).to.not.equal(newSession.token);

  });

  it(`should remove Session information upon user deletion or logout. \
Upon logout, Sessions get deleted only for specific userAgent`, async () => {

    // Create user via userAgent 'test'
    const { user, auth } = await userService.create(newUserInfo, 'test');

    const userIdFromToken = userService.authController.verifyTokenInternal({ token: auth.token }).id;

    const session = await userService.sessionService.getOne(userIdFromToken, 'test');
    if (!session) return expect(true).to.equal(false);

    // Authenticate user via userAgent 'test123'
    const { auth: newAuth } = await userService.authenticate(newUserInfo.password, { phonenumber: user.phonenumber, email: user.email }, 'test123');

    const newSession = await userService.sessionService.getOne(userIdFromToken, 'test123');
    if (!newSession) return expect(true).to.equal(false);

    expect(auth.id).to.equal(newAuth.id);
    expect(auth.token).to.not.equal(newAuth.token);
    expect(auth.error).to.equal('');
    expect(newAuth.error).to.equal('');

    expect(session.token).to.equal(auth.token);
    expect(newSession.token).to.equal(newAuth.token);

    // Logout cause deletion of Session with userAgent 'test'
    await userService.logout(userIdFromToken, 'test');

    const allUserSessions = await userService.sessionService.getAllByUserId(userIdFromToken);

    // Found Session with userAgent 'test123'
    expect(allUserSessions.length).to.equal(1);
    expect(allUserSessions[0].token).to.equal(newAuth.token);
    expect(allUserSessions[0].userAgentHash).to.equal(sha1('test123'));

    // Remove user
    await userService.remove(userIdFromToken);

    const allUserSessionsAfterRemoval = await userService.sessionService.getAllByUserId(userIdFromToken);

    expect(allUserSessionsAfterRemoval.length).to.equal(0);
  });

  it('should clean up expired and malformed Sessions', async () => {

    // Create user, auth and Session with recieved token under the hood. Token TTL is taken from config here
    const { user, auth } = await userService.create(newUserInfo, 'test');
    if (!user.rights) return expect(true).to.equal(false);

    const lookupHash = (await userService.userRepo.getById(user.id)).lookupHash;
    if (!lookupHash) return expect(true).to.equal(false);

    // Make a request with quickly expired token
    const authRequest2: AuthDTRequest = {
      id: user.id,
      lookupHash,
      password: newUserInfo.password,
      ttl: '10ms'
    };

    const auth2 = await userService.authController.grant(authRequest2);

    await userService.sessionService.create(user.id, auth2.token, 'test2', user.rights);

    // Make a request with quickly expired token: another one for sure
    const authRequest3: AuthDTRequest = {
      id: user.id,
      lookupHash,
      password: newUserInfo.password,
      ttl: '10ms'
    };

    const auth3 = await userService.authController.grant(authRequest3);

    await userService.sessionService.create(user.id, auth3.token, 'test3', user.rights);

    // Create malformed Session
    await userService.sessionService.create(user.id, 'malformed', 'test4', user.rights);

    // Await 20 milliseconds for tokens to expire
    await new Promise(resolve => setTimeout(resolve, 20));

    const userSessionsBeforeCleanup = await userService.sessionService.getAllByUserId(user.id);

    expect(userSessionsBeforeCleanup.length).to.equal(4);

    await userService.cleanSessionRepo();

    const userSessions = await userService.sessionService.getAllByUserId(user.id);

    // Only original auth Session must be left
    expect(userSessions.length).to.equal(1);
    expect(userSessions[0].token).to.equal(auth.token);

  });

});