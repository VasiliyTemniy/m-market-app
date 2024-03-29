import type { Response } from 'supertest';
import type { Address, AddressDTN, UserDT, UserDTN, UserDTU } from '@m-market-app/models';
import { expect } from 'chai';
import 'mocha';
import supertest from 'supertest';
import app from '../app';
import { apiBaseUrl } from './test_helper';
import {
  initialUsers,
  genCorrectUsername,
  genCorrectName,
  genCorrectPhonenumber,
  genCorrectEmail,
  genIncorrectString,
  validUserInDB,
  validNewUser,
  validAddresses,
  createInitialUsers,
  createUser
} from './user_api_helper';
import { ValidationError } from 'sequelize';
import {
  dateRegExp,
  emailRegExp,
  maxEmailLen,
  maxNameLen,
  maxPasswordLen,
  maxPhonenumberLen,
  maxUsernameLen,
  minEmailLen,
  minNameLen,
  minPasswordLen,
  minPhonenumberLen,
  minUsernameLen,
  nameRegExp,
  phonenumberRegExp,
  usernameRegExp
} from '@m-market-app/shared-constants';
import { initLogin, userAgent } from './sessions_api_helper';
import { sessionService, userService } from '../controllers';
import { redisSessionClient } from '@m-market-app/backend-logic';



const api = supertest(app);


describe('User POST request tests', () => {

  beforeEach(async () => {
    await userService.authController.flushExternalDB();
    await userService.removeAll();
    await createInitialUsers();
  });

  it('A valid user can be added ', async () => {
    const newUser: UserDTN = {
      username: 'Ordan',
      name: 'Dmitry Dornichev',
      password: 'iwannabeahero',
      phonenumber: '89354652235'
    };

    await api
      .post(`${apiBaseUrl}/user`)
      .send(newUser)
      .expect(201)
      .expect('Content-Type', /application\/json/);

    await api
      .post(`${apiBaseUrl}/user`)
      .send(validNewUser)
      .expect(201)
      .expect('Content-Type', /application\/json/);

    const usersAtEnd = await userService.getAll();
    expect(usersAtEnd).to.have.lengthOf(initialUsers.length + 2);

    const userCheck = await userService.userRepo.getByUniqueProperties({ username: validNewUser.username });
    expect(userCheck).to.exist;
    if (!userCheck) return;

    expect(userCheck.username).to.equal(validNewUser.username);
    expect(userCheck.name).to.equal(validNewUser.name);
    expect(userCheck.phonenumber).to.equal(validNewUser.phonenumber);
    expect(userCheck.email).to.equal(validNewUser.email);
    expect(userCheck.birthdate?.toISOString()).to.equal(validNewUser.birthdate);

    const usernames = usersAtEnd.map(user => user.username);
    expect(usernames).to.contain('Ordan');
  });

  it('User without phonenumber is not added', async () => {
    const newUser = {
      username: 'Ordan',
      name: 'Dmitry Dornichev',
      password: 'iwannabeahero'
    };

    const response = await api
      .post(`${apiBaseUrl}/user`)
      .send(newUser)
      .expect(400);

    expect(response.body.error.name).to.equal('RequestBodyError');
    expect(response.body.error.message).to.equal('Invalid new user request body');

    const usersAtEnd = await userService.getAll();

    expect(usersAtEnd).to.have.lengthOf(initialUsers.length);
  });

  it('User with only password and phonenumber is added', async () => {
    const newUser: UserDTN = {
      password: 'iwannabeahero',
      phonenumber: '89354652235'
    };

    await api
      .post(`${apiBaseUrl}/user`)
      .send(newUser)
      .expect(201)
      .expect('Content-Type', /application\/json/);

    const usersAtEnd = await userService.getAll();
    expect(usersAtEnd).to.have.lengthOf(initialUsers.length + 1);

    const phonenumbers = usersAtEnd.map(user => user.phonenumber);
    expect(phonenumbers).to.contain(
      '89354652235'
    );
  });

  it('Username must be unique, if not - new user is not added', async () => {
    const newUser: UserDTN = {
      username: 'StevieDoesntKnow', // already in initialUsers
      name: 'Dmitry Dornichev',
      password: 'iwannabeahero',
      phonenumber: '89354652235'
    };

    const response = await api
      .post(`${apiBaseUrl}/user`)
      .send(newUser)
      .expect(409);

    expect(response.body.error.name).to.equal('SequelizeUniqueConstraintError');
    expect(response.body.error.message).to.equal('Some internal DB constraints error or Sequelize error');

    expect(response.body.error.originalError).to.exist;

    const usersAtEnd = await userService.getAll();

    expect(usersAtEnd).to.have.lengthOf(initialUsers.length);
  });

  it('Phonenumber must be unique, if not - new user is not added', async () => {
    const newUser: UserDTN = {
      username: 'Ordan',
      name: 'Dmitry Dornichev',
      password: 'iwannabeahero',
      phonenumber: '88003561256' // already in initialUsers
    };

    const response = await api
      .post(`${apiBaseUrl}/user`)
      .send(newUser)
      .expect(409);

    expect(response.body.error.name).to.equal('SequelizeUniqueConstraintError');
    expect(response.body.error.message).to.equal('Some internal DB constraints error or Sequelize error');

    expect(response.body.error.originalError).to.exist;

    const usersAtEnd = await userService.getAll();

    expect(usersAtEnd).to.have.lengthOf(initialUsers.length);
  });

  it('Email must be unique, if not - new user is not added', async () => {
    const newUser: UserDTN = {
      username: 'Ordan',
      name: 'Dmitry Dornichev',
      password: 'iwannabeahero',
      phonenumber: '88654561256',
      email: 'my-emah@jjjjppp.com' // already in initialUsers
    };

    const response = await api
      .post(`${apiBaseUrl}/user`)
      .send(newUser)
      .expect(409);

    expect(response.body.error.name).to.equal('SequelizeUniqueConstraintError');
    expect(response.body.error.message).to.equal('Some internal DB constraints error or Sequelize error');

    expect(response.body.error.originalError).to.exist;

    const usersAtEnd = await userService.getAll();

    expect(usersAtEnd).to.have.lengthOf(initialUsers.length);
  });

  it('DB Validation checks for user work - incorrect user data fails', async () => {

    const newUserFail1: UserDTN = {
      username: 'Or', // len < 3
      name: 'Dm', // len < 3
      password: 'iwannabeahero',
      phonenumber: '8800', // len < 5, but fails regex too
      email: 'fk1sd', // len < minlength, but fails isEmail too
      birthdate: 'ohI`mNotADateSir!' // !isDate
    };

    const response1 = await api
      .post(`${apiBaseUrl}/user`)
      .send(newUserFail1)
      .expect(400);

    expect(response1.body.error.name).to.equal('SequelizeValidationError');
    expect(response1.body.error.message).to.equal('Some internal DB constraints error or Sequelize error');

    if (response1.body.error.name !== 'SequelizeValidationError') return;

    const validationError1 = response1.body.error.originalError as ValidationError;
    const errorMessages1 = validationError1.errors.map(error => error.message);

    expect(errorMessages1).to.have.members([
      'Validation len on username failed',
      'Validation len on name failed',
      'Validation len on phonenumber failed',
      'Validation is on phonenumber failed',
      'Validation is on email failed',
      'Validation len on email failed',
      'Validation isDate on birthdate failed'
    ]);

    const newUserFail2: UserDTN = {
      username: 'Василий', // Russian letters in username regex
      name: '_Dmitry', // Starts with _ regex
      password: 'iwannabeahero',
      phonenumber: '+7-(985)-(500)-32-45', // second -(500) prohibited regex
      email: 'fk@sd.ru', // correct
      birthdate: '23.07.2001 13:12' // !isDate
    };

    const response2 = await api
      .post(`${apiBaseUrl}/user`)
      .send(newUserFail2)
      .expect(400);

    expect(response2.body.error.name).to.equal('SequelizeValidationError');
    expect(response2.body.error.message).to.equal('Some internal DB constraints error or Sequelize error');

    if (response2.body.error.name !== 'SequelizeValidationError') return;

    const validationError2 = response2.body.error.originalError as ValidationError;
    const errorMessages2 = validationError2.errors.map(error => error.message);

    expect(errorMessages2).to.have.members([
      'Validation is on username failed',
      'Validation is on name failed',
      'Validation is on phonenumber failed',
      'Validation isDate on birthdate failed'
    ]);

    const newUserFail3: UserDTN = {
      username: '_Vasiliy', // Starts with _ regex
      name: 'Василий_', // Ends with _, though russian letters welcome regex
      password: 'iwannabeahero',
      phonenumber: '+7-(985)-500-32-45-12', // just incorrect by regex
      email: 'f@d.u', // len < 6, regex
      birthdate: '2001-07-23_07:31:03.242Z' // !isDate
    };

    const response3 = await api
      .post(`${apiBaseUrl}/user`)
      .send(newUserFail3)
      .expect(400);

    expect(response3.body.error.name).to.equal('SequelizeValidationError');
    expect(response3.body.error.message).to.equal('Some internal DB constraints error or Sequelize error');

    if (response3.body.error.name !== 'SequelizeValidationError') return;

    const validationError3 = response3.body.error.originalError as ValidationError;
    const errorMessages3 = validationError3.errors.map(error => error.message);

    expect(errorMessages3).to.have.members([
      'Validation is on username failed',
      'Validation is on name failed',
      'Validation is on phonenumber failed',
      'Validation is on email failed',
      'Validation len on email failed',
      'Validation isDate on birthdate failed'
    ]);

    const usersAtEnd = await userService.getAll();

    expect(usersAtEnd).to.have.lengthOf(initialUsers.length);

  });

  it('Password length must be in range specified in constants.ts', async () => {
    const newUser: UserDTN = {
      username: 'Petro',
      name: 'Vasilenko Pyotr Ivanovich',
      password: 'iwbah',
      phonenumber: '89354652288',
      email: 'my-email.vah@jjjjppp.com',
      birthdate: '2001-07-23T07:31:03.242Z',
    };

    const response = await api
      .post(`${apiBaseUrl}/user`)
      .send(newUser)
      .expect(400);

    expect(response.body.error.name).to.equal('PasswordLengthError');
    expect(response.body.error.message).to.equal(`Password must be longer than ${minPasswordLen} and shorter than ${maxPasswordLen} symbols`);

    const usersAtEnd = await userService.getAll();

    expect(usersAtEnd).to.have.lengthOf(initialUsers.length);

  });

  it('Bulk autogenerated correct users add', async () => {

    let added: number = 0;

    const usersInDb = await userService.getAll();

    const usernamesSet = new Set([...usersInDb.map(user => user.username)]);
    const phonenumbersSet = new Set([...usersInDb.map(user => user.phonenumber)]);
    const emailsSet = new Set([...usersInDb.map(user => user.email)]);

    for (let i = 0; i < 10; i++) {
      const newUser: UserDTN = {
        username: genCorrectUsername(minUsernameLen, maxUsernameLen),
        name: genCorrectName(minNameLen, maxNameLen),
        password: 'iwannabeahero',
        phonenumber: genCorrectPhonenumber(),
        email: genCorrectEmail(minEmailLen, maxEmailLen),
        birthdate: '2001-07-23T07:31:03.242Z',
      };

      if (
        usernamesSet.has(newUser.username as string)
        ||
        phonenumbersSet.has(newUser.phonenumber)
        ||
        emailsSet.has(newUser.email as string)
      ) {

        const response = await api
          .post(`${apiBaseUrl}/user`)
          .send(newUser)
          .expect(409);

        expect(response.body.error.name).to.equal('SequelizeUniqueConstraintError');
        expect(response.body.error.message).to.equal('Some internal DB constraints error or Sequelize error');

      } else {

        await api
          .post(`${apiBaseUrl}/user`)
          .send(newUser)
          .expect(201)
          .expect('Content-Type', /application\/json/);

        usernamesSet.add(newUser.username as string);
        phonenumbersSet.add(newUser.phonenumber);
        emailsSet.add(newUser.email as string);

        added++;

      }
    }

    const usersAtEnd = await userService.getAll();

    expect(usersAtEnd).to.have.lengthOf(initialUsers.length + added);

  }).timeout(30000);

  it('Bulk autogenerated incorrect users reject + expect correct errors', async () => {

    for (let i = 0; i < 10; i++) {
      const newIncorrectGen = {
        username: genIncorrectString('username', usernameRegExp, minUsernameLen, maxUsernameLen),
        name: genIncorrectString('name', nameRegExp, minNameLen, maxNameLen),
        password: 'iwannabeahero',
        phonenumber: genIncorrectString('phonenumber', phonenumberRegExp, minPhonenumberLen, maxPhonenumberLen),
        email: genIncorrectString('email', emailRegExp, minEmailLen, maxEmailLen),
        birthdate: genIncorrectString('birthdate', dateRegExp, 1, 52, true),
      };

      const newUserIncorrect: UserDTN = {
        username: newIncorrectGen.username.result,
        name: newIncorrectGen.name.result,
        password: newIncorrectGen.password,
        phonenumber: newIncorrectGen.phonenumber.result,
        email: newIncorrectGen.email.result,
        birthdate: newIncorrectGen.birthdate.result
      };

      const errorsSet = new Set([
        ...newIncorrectGen.username.errors,
        ...newIncorrectGen.name.errors,
        ...newIncorrectGen.phonenumber.errors,
        ...newIncorrectGen.email.errors,
        ...newIncorrectGen.birthdate.errors
      ]);

      const response = await api
        .post(`${apiBaseUrl}/user`)
        .send(newUserIncorrect)
        .expect(400);

      expect(response.body.error.name).to.equal('SequelizeValidationError');
      expect(response.body.error.message).to.equal('Some internal DB constraints error or Sequelize error');

      if (response.body.error.name !== 'SequelizeValidationError') return;

      const validationError = response.body.error.originalError as ValidationError;
      const errorMessages = validationError.errors.map(error => error.message);

      expect(errorMessages).to.have.members(Array.from(errorsSet));

    }

    const usersAtEnd = await userService.getAll();

    expect(usersAtEnd).to.have.lengthOf(initialUsers.length);

  }).timeout(30000);

});


describe('User PUT request tests', () => {

  let validUser: UserDT;
  let createdUsers: UserDT[];

  before(async () => {
    await userService.authController.flushExternalDB();
    await userService.removeAll();
    createdUsers = await createInitialUsers();
  });

  beforeEach(async () => {
    if (validUser) await userService.userRepo.deleteForTest(validUser.id);
    await redisSessionClient.flushDb();
    validUser = await createUser(validUserInDB.dtn);
  });

  it('A valid request to change user credentials succeds, needs original password', async () => {

    const tokenCookie = await initLogin(validUser, validUserInDB.password, api, 201, userAgent) as string;

    const updateUserData: UserDTU = {
      id: validUser.id,
      username: 'Ordan',
      name: 'Dmitry Dornichev',
      password: validUserInDB.password,
      newPassword: 'iwannabeaREALhero',
      phonenumber: '89351111356',
      email: 'my-new-email@mail.mail',
      birthdate: '1956-07-23T07:31:03.242Z'
    };

    await api
      .put(`${apiBaseUrl}/user/${validUser.id}`)
      .set('Cookie', [tokenCookie])
      .set('User-Agent', userAgent)
      .send(updateUserData)
      .expect(200)
      .expect('Content-Type', /application\/json/);

    const updatedUserInDB = await userService.getById(validUser.id);

    if (!updatedUserInDB) return expect(true).to.equal(false);

    expect(updatedUserInDB.username).to.equal(updateUserData.username);
    expect(updatedUserInDB.name).to.equal(updateUserData.name);
    expect(updatedUserInDB.phonenumber).to.equal(updateUserData.phonenumber);
    expect(updatedUserInDB.email).to.equal(updateUserData.email);
    expect(updatedUserInDB.birthdate).to.equal(updateUserData.birthdate);

    // Check that password was changed
    await initLogin(updateUserData, updateUserData.newPassword!, api, 201, userAgent) as string;
  });

  it('Request to change another user`s data fails', async () => {

    const tokenCookie = await initLogin(validUser, validUserInDB.password, api, 201, userAgent) as string;

    const updateUserData: UserDTU = {
      id: validUser.id,
      username: 'Ordan',
      name: 'Dmitry Dornichev',
      password: validUserInDB.password,
      newPassword: 'iwannabeaREALhero',
      phonenumber: '89351111356',
      email: 'my-new-email@mail.mail',
      birthdate: '1956-07-23T07:31:03.242Z'
    };

    const responseNonExisting = await api
      .put(`${apiBaseUrl}/user/100500`) // not existing user
      .set('Cookie', [tokenCookie])
      .set('User-Agent', userAgent)
      .send(updateUserData)
      .expect(418)
      .expect('Content-Type', /application\/json/);

    expect(responseNonExisting.body.error.name).to.equal('HackError');
    expect(responseNonExisting.body.error.message).to.equal('User attempts to change another users data or invalid user id');

    const responseAnotherUser = await api
      .put(`${apiBaseUrl}/user/${createdUsers[0].id}`)
      .set('Cookie', [tokenCookie])
      .set('User-Agent', userAgent)
      .send(updateUserData)
      .expect(418)
      .expect('Content-Type', /application\/json/);

    expect(responseAnotherUser.body.error.name).to.equal('HackError');
    expect(responseAnotherUser.body.error.message).to.equal('User attempts to change another users data or invalid user id');

  });

  it('Request without password fails', async () => {

    const tokenCookie = await initLogin(validUser, validUserInDB.password, api, 201, userAgent) as string;

    const updateUserData = {
      id: validUser.id,
      username: 'Ordan',
      name: 'Dmitry Dornichev',
      newPassword: 'iwannabeaREALhero',
      phonenumber: '89351111356',
      email: 'my-new-email@mail.mail',
      birthdate: '1956-07-23T07:31:03.242Z'
    };

    const response = await api
      .put(`${apiBaseUrl}/user/${validUser.id}`)
      .set('Cookie', [tokenCookie])
      .set('User-Agent', userAgent)
      .send(updateUserData)
      .expect(400)
      .expect('Content-Type', /application\/json/);

    expect(response.body.error.name).to.equal('RequestBodyError');
    expect(response.body.error.message).to.equal('Invalid edit user request body');

  });

});


describe('User GET request tests', () => {

  let validUser: UserDT;

  before(async () => {
    await userService.authController.flushExternalDB();
    await userService.removeAll();
    await createInitialUsers();
    validUser = await createUser(validUserInDB.dtn);
  });

  beforeEach(async () => {
    await sessionService.removeAll();
  });

  it('A users/me path gives correct user info to frontend', async () => {

    const tokenCookie = await initLogin(validUser, validUserInDB.password, api, 201, userAgent) as string;

    const response = await api
      .get(`${apiBaseUrl}/user/me`)
      .set('Cookie', [tokenCookie])
      .set('User-Agent', userAgent)
      .expect(200)
      .expect('Content-Type', /application\/json/);

    expect(response.body.id).to.equal(validUser.id);
    expect(response.body.username).to.equal(validUser.username);
    expect(response.body.name).to.equal(validUser.name);
    expect(response.body.phonenumber).to.equal(validUser.phonenumber);
    expect(response.body.email).to.equal(validUser.email);
    expect(response.body.birthdate).to.equal(validUser.birthdate);

  });

  it('A users/me path requires authorization', async () => {

    const response = await api
      .get(`${apiBaseUrl}/user/me`)
      .set('User-Agent', userAgent)
      .expect(401)
      .expect('Content-Type', /application\/json/);

    expect(response.body.error.name).to.equal('AuthorizationError');
    expect(response.body.error.message).to.equal('Authorization required');

  });

});

describe('User DELETE request tests', () => {

  let validUser: UserDT;

  before(async () => {
    await userService.authController.flushExternalDB();
    await userService.removeAll();
    await createInitialUsers();
  });

  beforeEach(async () => {
    if (validUser) await userService.userRepo.deleteForTest(validUser.id);
    await sessionService.removeAll();
    validUser = await createUser(validUserInDB.dtn);
  });

  it('User delete route works, marks user as deletedAt, gets response with deletedAt mark. All his sessions get deleted. \
User marked as deleted gets appropriate message when trying to login', async () => {

    const tokenCookie = await initLogin(validUser, validUserInDB.password, api, 201, userAgent) as string;

    const userBeforeDeletion = await userService.getById(validUser.id);
    if (!userBeforeDeletion) return expect(true).to.equal(false);

    expect(!userBeforeDeletion.deletedAt).to.equal(true);

    const response1 = await api
      .delete(`${apiBaseUrl}/user`)
      .set('Cookie', [tokenCookie])
      .set('User-Agent', userAgent)
      .expect(200)
      .expect('Content-Type', /application\/json/);

    expect(response1.body.deletedAt).to.exist;

    const sessions = await sessionService.getAllByUserId(validUser.id);

    expect(sessions).to.be.lengthOf(0);

    const deletedUser = await userService.getById(validUser.id);
    if (!deletedUser) return expect(true).to.equal(false);

    expect(!deletedUser.deletedAt).to.equal(false);

    const response2 = await api
      .get(`${apiBaseUrl}/user/me`)
      .set('Cookie', [tokenCookie])
      .set('User-Agent', userAgent)
      .expect(403)
      .expect('Content-Type', /application\/json/);

    expect(response2.body.error.name).to.equal('ProhibitedError');
    expect(response2.body.error.message).to.equal('You have deleted your own account. To delete it permanently or restore it, contact admin');

  });

});



describe('User addresses requests tests', () => {

  let validUser: UserDT;
  let createdUsers: UserDT[];
  let secondValidUser: UserDT;
  let secondValidUserPassword: string;

  before(async () => {
    await userService.authController.flushExternalDB();
    await userService.removeAll();
    createdUsers = await createInitialUsers();
    const foundSecondUser = initialUsers.find(user => user.phonenumber === createdUsers[0].phonenumber);
    if (!foundSecondUser) throw Error('User not found; check createInitialUsers()');
    secondValidUser = createdUsers[0];
    secondValidUserPassword = foundSecondUser.password;
  });

  beforeEach(async () => {
    if (validUser) await userService.userRepo.deleteForTest(validUser.id);
    await sessionService.removeAll();
    validUser = await createUser(validUserInDB.dtn);

    await userService.addressRepo.removeAll();
  });

  it('A valid request to add user address succeeds, user address gets added to junction table', async () => {

    const tokenCookie = await initLogin(validUser, validUserInDB.password, api, 201, userAgent) as string;

    const responses: Response[] = [];

    for (const address of validAddresses) {
      const response = await api
        .post(`${apiBaseUrl}/user/address`)
        .set('Cookie', [tokenCookie])
        .set('User-Agent', userAgent)
        .send(address)
        .expect(201)
        .expect('Content-Type', /application\/json/);
      responses.push(response);
    }

    const addressesInDB = await userService.addressRepo.getAll();

    const junctions = await userService.addressRepo.getAllUserAddresses();

    expect(addressesInDB).to.be.lengthOf(validAddresses.length);
    expect(junctions).to.be.lengthOf(validAddresses.length);

    for (const response of responses) {
      const addressInDB = await userService.addressRepo.getById(response.body.id as number);
      expect(addressInDB).to.exist;
      for (const key in response.body) {
        if ((key !== 'createdAt') && (key !== 'updatedAt'))
          expect(response.body[key]).to.equal(addressInDB[key as keyof Address]);
      }
      const junction = junctions.find(j => j.addressId === addressInDB.id);
      expect(junction?.userId).to.equal(validUser.id);
    }

  });

  it('The same address cannot be added twice to the same user. \
If another user adds the same address, the address does not get created, instead a new association is added', async () => {

    const tokenCookie1 = await initLogin(validUser, validUserInDB.password, api, 201, userAgent) as string;

    await api
      .post(`${apiBaseUrl}/user/address`)
      .set('Cookie', [tokenCookie1])
      .set('User-Agent', userAgent)
      .send(validAddresses[0])
      .expect(201)
      .expect('Content-Type', /application\/json/);

    await api
      .post(`${apiBaseUrl}/user/address`)
      .set('Cookie', [tokenCookie1])
      .set('User-Agent', userAgent)
      .send(validAddresses[0])
      .expect(409)
      .expect('Content-Type', /application\/json/);

    const foundUser = initialUsers.find(u => u.phonenumber === createdUsers[0].phonenumber);
    if (!foundUser) return expect(true).to.equal(false);
    const tokenCookie2 = await initLogin(createdUsers[0], foundUser.password, api, 201, userAgent) as string;

    await api
      .post(`${apiBaseUrl}/user/address`)
      .set('Cookie', [tokenCookie2])
      .set('User-Agent', userAgent)
      .send(validAddresses[0])
      .expect(201)
      .expect('Content-Type', /application\/json/);


    const addressesInDB = await userService.addressRepo.getAll();

    const junctions = await userService.addressRepo.getAllUserAddresses();

    expect(addressesInDB).to.be.lengthOf(1);
    expect(junctions).to.be.lengthOf(2);

  });

  it('User address update works correctly, deletes address if no other user uses it, \
does not delete address if somebody or a facility uses it, adds a new address if it did not exist, \
adds only a new junction if it was existing', async () => {

    const tokenCookie1 = await initLogin(validUser, validUserInDB.password, api, 201, userAgent) as string;
    const tokenCookie2 = await initLogin(secondValidUser, secondValidUserPassword, api, 201, userAgent) as string;

    const response1 = await api
      .post(`${apiBaseUrl}/user/address`)
      .set('Cookie', [tokenCookie1])
      .set('User-Agent', userAgent)
      .send(validAddresses[0])
      .expect(201)
      .expect('Content-Type', /application\/json/);

    const response2 = await api
      .put(`${apiBaseUrl}/user/address/${response1.body.id}`)
      .set('Cookie', [tokenCookie1])
      .set('User-Agent', userAgent)
      .send({
        id: response1.body.id as number,
        ...validAddresses[1]
      })
      .expect(200)
      .expect('Content-Type', /application\/json/);

    // To check that response data is valid and updated
    for (const key in response2.body) {
      if ((key !== 'createdAt') && (key !== 'updatedAt') && (key !== 'id'))
        expect(response2.body[key]).to.equal(validAddresses[1][key as keyof AddressDTN]);
    }

    // To make sure old address is deleted if not used by anybody
    const addressesInDB1 = await userService.addressRepo.getAll();
    expect(addressesInDB1).to.be.lengthOf(1);

    // To make sure that old junction does not exist
    const junctions1 = await userService.addressRepo.getAllUserAddresses();
    expect(junctions1[0].userId).to.equal(validUser.id);
    expect(junctions1).to.be.lengthOf(1);

    await api
      .post(`${apiBaseUrl}/user/address`)
      .set('Cookie', [tokenCookie2])
      .set('User-Agent', userAgent)
      .send(validAddresses[1])    // The same address as the one that first user changed to 
      .expect(201)
      .expect('Content-Type', /application\/json/);

    const response4 = await api
      .post(`${apiBaseUrl}/user/address`)
      .set('Cookie', [tokenCookie2])
      .set('User-Agent', userAgent)
      .send(validAddresses[0])    // The previously deleted by first user address
      .expect(201)
      .expect('Content-Type', /application\/json/);

    // Below is strange attempt to edit address data of a new (for this user) address to data of a previous one
    // He should have just deleted the address validAdresses[0], but he is kind of dumb
    // So, this attempt gives 409 and does nothing
    await api
      .put(`${apiBaseUrl}/user/address/${response4.body.id}`)
      .set('Cookie', [tokenCookie2])
      .set('User-Agent', userAgent)
      .send({
        id: response4.body.id as number,
        ...validAddresses[1]
      })
      .expect(409)
      .expect('Content-Type', /application\/json/);

    // To make sure that first address is added back
    const addressesInDB2 = await userService.addressRepo.getAll();
    expect(addressesInDB2).to.be.lengthOf(2);

    // To make sure that first user has one junction, and second user has two of them
    const junctions2 = await userService.addressRepo.getAllUserAddresses();
    expect(junctions2).to.be.lengthOf(3);

  });

  it('Delete user address route works. If the address is used by anybody else, it does not get deleted', async () => {

    const tokenCookie1 = await initLogin(validUser, validUserInDB.password, api, 201, userAgent) as string;
    const tokenCookie2 = await initLogin(secondValidUser, secondValidUserPassword, api, 201, userAgent) as string;

    const response1 = await api
      .post(`${apiBaseUrl}/user/address`)
      .set('Cookie', [tokenCookie1])
      .set('User-Agent', userAgent)
      .send(validAddresses[0])
      .expect(201)
      .expect('Content-Type', /application\/json/);

    // Second user adds first address as his own. Maybe, they live together
    const response2 = await api
      .post(`${apiBaseUrl}/user/address`)
      .set('Cookie', [tokenCookie2])
      .set('User-Agent', userAgent)
      .send(validAddresses[0])
      .expect(201)
      .expect('Content-Type', /application\/json/);

    // Second user lives in two apartments
    const response3 = await api
      .post(`${apiBaseUrl}/user/address`)
      .set('Cookie', [tokenCookie2])
      .set('User-Agent', userAgent)
      .send(validAddresses[1])
      .expect(201)
      .expect('Content-Type', /application\/json/);

    // Just to make sure that it is the same address, and DB did not create another row
    expect(response1.body.id).to.equal(response2.body.id);

    const userAddresses1 = await userService.addressRepo.getAllUserAddresses();
    const addresses1 = await userService.addressRepo.getAll();

    // 2 records for addresses, 3 for user's addresses
    expect(userAddresses1).to.be.lengthOf(3);
    expect(addresses1).to.be.lengthOf(2);

    // Appears that... They break up :\
    await api
      .delete(`${apiBaseUrl}/user/address/${response2.body.id}`)
      .set('Cookie', [tokenCookie2])
      .set('User-Agent', userAgent)
      .expect(204);

    // Also appears that the second user does not live anywhere anymore...
    await api
      .delete(`${apiBaseUrl}/user/address/${response3.body.id}`)
      .set('Cookie', [tokenCookie2])
      .set('User-Agent', userAgent)
      .expect(204);

    const userAddresses2 = await userService.addressRepo.getAllUserAddresses();
    const addresses2 = await userService.addressRepo.getAll();

    // Now only the first user has address, and it is validAddresses[0]
    expect(userAddresses2).to.be.lengthOf(1);
    expect(addresses2).to.be.lengthOf(1);

    expect(userAddresses2[0].userId).to.equal(validUser.id);

    expect(addresses2[0].city).to.equal(validAddresses[0].city);
    expect(addresses2[0].street).to.equal(validAddresses[0].street);

  });

});