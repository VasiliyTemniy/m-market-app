import { expect } from 'chai';
import 'mocha';
import supertest from 'supertest';
import app from '../app';
import { apiBaseUrl } from './test_helper';
import {
  createInitialUsers,
  createUser,
  validUserInDB,
} from './user_api_helper';
import jwt from 'jsonwebtoken';
import * as fc from 'fast-check';
import { initLogin, userAgent } from './sessions_api_helper';
import sha1 from 'sha1';
import { sessionService, userService } from '../controllers';
import type { AuthDTRequest, UserDT, UserLoginDT } from '@m-market-app/models';
import { logger } from '@m-market-app/utils';



const api = supertest(app);


describe('Login and session', () => {

  let validUser: UserDT;

  before(async () => {
    await userService.removeAll();
    await createInitialUsers();
    validUser = await createUser(validUserInDB.dtn);
  });

  beforeEach(async () => {
    await sessionService.removeAll();
  });

  it('User login with correct credentials as password and (username or phonenumber) \
succeds and gives token + id (userId) as response', async () => {

    const loginBodyUsername: UserLoginDT = {
      username: validUserInDB.dtn.username as string,
      password: validUserInDB.password
    };

    const responseUsername = await api
      .post(`${apiBaseUrl}/session`)
      .send(loginBodyUsername)
      .expect(201);

    expect(responseUsername.headers['set-cookie']).to.exist;

    const loginBodyPhonenumber: UserLoginDT = {
      phonenumber: validUserInDB.dtn.phonenumber,
      password: validUserInDB.password
    };

    const responsePhonenumber = await api
      .post(`${apiBaseUrl}/session`)
      .send(loginBodyPhonenumber)
      .expect(201);

    expect(responsePhonenumber.headers['set-cookie']).to.exist;

  });

  it('Token is sent via http-only cookie; This cookie is accepted by backend middleware; Authorization: bearer is not accepted', async () => {

    const loginBody: UserLoginDT = {
      phonenumber: validUserInDB.dtn.phonenumber,
      password: validUserInDB.password
    };

    const response1 = await api
      .post(`${apiBaseUrl}/session`)
      .set('User-Agent', userAgent)
      .send(loginBody as object)
      .expect(201);

    expect(response1.headers['set-cookie']).to.exist;

    const cookieMessage = response1.headers['set-cookie'][0] as string;

    const cookieParts = cookieMessage.split('; ');

    expect(cookieParts[cookieParts.length - 1]).to.equal('HttpOnly');

    const token = cookieParts[0].substring(6);

    const response2 = await api
      .get(`${apiBaseUrl}/user/me`)
      .set({ Authorization: `bearer ${token}` })
      .set('User-Agent', userAgent)
      .expect(401)
      .expect('Content-Type', /application\/json/);

    expect(response2.body.error.name).to.equal('AuthorizationError');
    expect(response2.body.error.message).to.equal('Authorization required');

    const response3 = await api
      .get(`${apiBaseUrl}/user/me`)
      .set('Cookie', [response1.headers['set-cookie'][0] as string])
      .set('User-Agent', userAgent)
      .expect(200)
      .expect('Content-Type', /application\/json/);

    expect(response3.body.username).to.equal(validUserInDB.dtn.username);

  });

  it('User login leads to creation of a session with user id and token. Sequential login attempt from the \
same browser(userAgent) without logout leads to session token refresh', async () => {

    const tokenCookieFirst = await initLogin(validUser, validUserInDB.password, api, 201, 'SUPERTEST') as string;

    const sessionsFirst = await sessionService.getAllByUserId(validUser.id);

    expect(sessionsFirst).to.be.lengthOf(1);
    expect(sessionsFirst[0].token).to.equal(tokenCookieFirst.split('; ')[0].substring(6));

    const tokenCookieSecond = await initLogin(validUser, validUserInDB.password, api, 201, 'SUPERTEST') as string;

    const sessionsSecond = await sessionService.getAllByUserId(validUser.id);

    expect(sessionsSecond).to.be.lengthOf(1);
    expect(sessionsSecond[0].token).to.equal(tokenCookieSecond.split('; ')[0].substring(6));

  });

  it('User login from different browsers create different sessions', async () => {

    const userAgents = ['SUPERTEST', 'MEGAUBERTEST'];

    await initLogin(validUser, validUserInDB.password, api, 201, userAgents[0]);

    await initLogin(validUser, validUserInDB.password, api, 201, userAgents[1]);

    const sessions = await sessionService.getAllByUserId(validUser.id);

    expect(sessions).to.be.lengthOf(2);

    expect(sessions[0].token).not.to.be.equal(sessions[1].token);
    expect(sessions[0].userAgentHash).not.to.be.equal(sessions[1].userAgentHash);

    expect(sessions[0].userId).to.be.equal(sessions[1].userId);

    const userAgentsInDB = sessions.map(session => session.userAgentHash);

    const hashedUserAgents = userAgents.map(agent => sha1(agent));

    expect(userAgentsInDB).to.have.members(hashedUserAgents);

  });

  it('User login with incorrect credentials fails', async () => {

    const loginBody: UserLoginDT = {
      phonenumber: validUserInDB.dtn.phonenumber,
      password: 'DasIstBeliberda'
    };

    const response = await api
      .post(`${apiBaseUrl}/session`)
      .send(loginBody)
      .expect(401)
      .expect('Content-Type', /application\/json/);

    expect(response.body.error.name).to.equal('CredentialsError');
    expect(response.body.error.message).to.equal('Invalid password');

  });

  it('User login with incorrect credentials fails - property test', async () => {

    const loginStateProperty = fc.asyncProperty(fc.string(), async (password) => {

      if (password === validUserInDB.password) expect(true).to.equal(true);
      else {

        const response = await api
          .post(`${apiBaseUrl}/session`)
          .send({
            phonenumber: validUserInDB.dtn.phonenumber,
            password
          })
          .expect(401)
          .expect('Content-Type', /application\/json/);

        expect(response.body.error.name).to.equal('CredentialsError');
        expect(response.body.error.message).to.equal('Invalid password');

      }

    });

    await fc.assert(loginStateProperty, { numRuns: 10 });

  });

  it('Token TTL and expire system works as intended, session gets deleted if expired token detected on protected route', async () => {

    const userInDB = await userService.userRepo.getById(validUser.id);

    if (!userInDB) return expect(true).to.equal(false);

    // Make a request with quickly expired token
    const authRequest: AuthDTRequest = {
      id: userInDB.id,
      lookupHash: userInDB.lookupHash as string,
      password: validUserInDB.password,
      ttl: '10ms'
    };

    const auth = await userService.authController.grant(authRequest);

    if (!auth.token || auth.error) {
      logger.shout('Token generation error ', auth.error);
      return expect(true).to.equal(false);
    }

    await sessionService.create(userInDB.id, auth.token, userAgent, userInDB.rights as string);

    // Await expiracy
    await new Promise(resolve => setTimeout(resolve, 20));

    const tokenCookie = `token=${auth.token}; HttpOnly`;

    const response = await api
      .get(`${apiBaseUrl}/user/me`)
      .set('Cookie', [tokenCookie])
      .set('User-Agent', 'SUPERTEST')
      .expect(401)
      .expect('Content-Type', /application\/json/);

    expect(response.body.error.name).to.equal('TokenExpiredError');
    expect(response.body.error.message).to.equal('Token expired. Please, relogin');

    const sessions = await sessionService.getAllByUserId(userInDB.id);

    expect(sessions).to.be.lengthOf(0);

  });

  it('Malformed / incorrect token is not accepted', async () => {

    const invalidTokenCookie = `token=IAmALittleToken; HttpOnly`;

    const responseInvToken = await api
      .get(`${apiBaseUrl}/user/me`)
      .set('Cookie', [invalidTokenCookie])
      .expect(401)
      .expect('Content-Type', /application\/json/);

    expect(responseInvToken.body.error.name).to.equal('AuthorizationError');
    expect(responseInvToken.body.error.message).to.equal('AuthorizationError: jwt malformed');


    // Self-signed token
    const tokenInvSecret = jwt.sign({
      id: validUser.id,
      rand: Math.random() * 10000
    }, 'IAmASpecialChineseSeckrette', { expiresIn: '1d' });

    const tokenInvSecretCookie = `token=${tokenInvSecret}; HttpOnly`;

    const responseInvSecret = await api
      .get(`${apiBaseUrl}/user/me`)
      .set('Cookie', [tokenInvSecretCookie])
      .expect(401)
      .expect('Content-Type', /application\/json/);

    expect(responseInvSecret.body.error.name).to.equal('AuthorizationError');
    expect(responseInvSecret.body.error.message).to.equal('AuthorizationError: invalid algorithm');

  });

  it('Valid token is accepted only when there is a Session record in DB for it', async () => {

    const userInDB = await userService.userRepo.getById(validUser.id);

    if (!userInDB) return expect(true).to.equal(false);

    // Make a request with quickly expired token
    const authRequest: AuthDTRequest = {
      id: userInDB.id,
      lookupHash: userInDB.lookupHash as string,
      password: validUserInDB.password,
      ttl: '1d'
    };

    const auth = await userService.authController.grant(authRequest);

    if (!auth.token || auth.error) {
      logger.shout('Token generation error ', auth.error);
      return expect(true).to.equal(false);
    }

    const tokenValidCookie = `token=${auth.token}; HttpOnly`;

    const response = await api
      .get(`${apiBaseUrl}/user/me`)
      .set('Cookie', [tokenValidCookie])
      .expect(401)
      .expect('Content-Type', /application\/json/);

    expect(response.body.error.name).to.equal('SessionError');
    expect(response.body.error.message).to.equal('Inactive session. Please, login');

  });

  it('Token refresh route works (route without a password, checks only for a valid token; must have a Session record)', async () => {

    const tokenCookie = await initLogin(validUser, validUserInDB.password, api, 201, userAgent) as string;

    const token = tokenCookie.split('; ')[0].substring(6);

    const responseRefreshed = await api
      .get(`${apiBaseUrl}/session/refresh`)
      .set('Cookie', [tokenCookie])
      .set('User-Agent', userAgent)
      .expect(200);

    if (!responseRefreshed.headers['set-cookie']) return expect(true).to.equal(false);

    const loginCookiesRefreshed = responseRefreshed.headers['set-cookie'] as string[];

    const tokenCookieRefreshed = loginCookiesRefreshed.find(cookie => cookie.startsWith('token='));

    if (!tokenCookieRefreshed) return expect(true).to.equal(false);

    const tokenRefreshed = tokenCookieRefreshed.split('; ')[0].substring(6);

    expect(token).to.not.equal(tokenRefreshed);

  });

  it('Logout route deletes Session', async () => {

    const tokenCookie = await initLogin(validUser, validUserInDB.password, api, 201, userAgent) as string;

    await api
      .delete(`${apiBaseUrl}/session`)
      .set('Cookie', [tokenCookie])
      .set('User-Agent', userAgent)
      .expect(204);

    const sessionsAfterLogout = await sessionService.getAllByUserId(validUser.id);

    expect(sessionsAfterLogout).to.be.lengthOf(0);

  });

});
