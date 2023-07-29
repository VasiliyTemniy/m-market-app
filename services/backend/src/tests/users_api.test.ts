import { expect } from "chai";
import "mocha";
import supertest, { Response } from 'supertest';
import app from "../app";
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
  initialUsersPassword
} from './users_api_helper';
import { Session, User } from '../models/index';
import { connectToDatabase } from "../utils/db";
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
} from "../utils/constants";
import {
  Address,
  AddressData,
  EditUserBody,
  NewAddressBody,
  NewUserBody,
  UserAddress
} from "@m-cafe-app/utils";
import { initLogin, userAgent } from "./sessions_api_helper";



await connectToDatabase();
const api = supertest(app);


describe('User POST request tests', () => {

  beforeEach(async () => {
    await User.destroy({ where: {} });
    await User.bulkCreate(initialUsers);
  });

  it('A valid user can be added ', async () => {
    const newUser: NewUserBody = {
      username: 'Ordan',
      name: 'Dmitry Dornichev',
      password: 'iwannabeahero',
      phonenumber: '89354652235'
    };

    await api
      .post(`${apiBaseUrl}/users`)
      .send(newUser)
      .expect(201)
      .expect('Content-Type', /application\/json/);

    await api
      .post(`${apiBaseUrl}/users`)
      .send(validNewUser)
      .expect(201)
      .expect('Content-Type', /application\/json/);

    const usersAtEnd = await User.findAll({});
    expect(usersAtEnd).to.have.lengthOf(initialUsers.length + 2);

    const userCheck = await User.findOne({ where: { username: validNewUser.username as string } });
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

    const result = await api
      .post(`${apiBaseUrl}/users`)
      .send(newUser)
      .expect(400);

    expect(result.body.error.name).to.equal('RequestBodyError');
    expect(result.body.error.message).to.equal('Invalid new user request body');

    const usersAtEnd = await User.findAll({});

    expect(usersAtEnd).to.have.lengthOf(initialUsers.length);
  });

  it('User with only password and phonenumber is added', async () => {
    const newUser: NewUserBody = {
      password: 'iwannabeahero',
      phonenumber: '89354652235'
    };

    await api
      .post(`${apiBaseUrl}/users`)
      .send(newUser)
      .expect(201)
      .expect('Content-Type', /application\/json/);

    const usersAtEnd = await User.findAll({});
    expect(usersAtEnd).to.have.lengthOf(initialUsers.length + 1);

    const phonenumbers = usersAtEnd.map(user => user.phonenumber);
    expect(phonenumbers).to.contain(
      '89354652235'
    );
  });

  it('Username must be unique, if not - new user is not added', async () => {
    const newUser: NewUserBody = {
      username: "StevieDoesntKnow", // already in initialUsers
      name: 'Dmitry Dornichev',
      password: 'iwannabeahero',
      phonenumber: '89354652235'
    };

    const result = await api
      .post(`${apiBaseUrl}/users`)
      .send(newUser)
      .expect(409);

    expect(result.body.error.name).to.equal('SequelizeUniqueConstraintError');
    expect(result.body.error.message).to.equal('Some internal DB constraints error or Sequelize error');

    expect(result.body.error.originalError).to.exist;

    const usersAtEnd = await User.findAll({});

    expect(usersAtEnd).to.have.lengthOf(initialUsers.length);
  });

  it('Phonenumber must be unique, if not - new user is not added', async () => {
    const newUser: NewUserBody = {
      username: "Ordan",
      name: 'Dmitry Dornichev',
      password: 'iwannabeahero',
      phonenumber: '88003561256' // already in initialUsers
    };

    const result = await api
      .post(`${apiBaseUrl}/users`)
      .send(newUser)
      .expect(409);

    expect(result.body.error.name).to.equal('SequelizeUniqueConstraintError');
    expect(result.body.error.message).to.equal('Some internal DB constraints error or Sequelize error');

    expect(result.body.error.originalError).to.exist;

    const usersAtEnd = await User.findAll({});

    expect(usersAtEnd).to.have.lengthOf(initialUsers.length);
  });

  it('Email must be unique, if not - new user is not added', async () => {
    const newUser: NewUserBody = {
      username: "Ordan",
      name: 'Dmitry Dornichev',
      password: 'iwannabeahero',
      phonenumber: '88654561256',
      email: 'my-emah@jjjjppp.com' // already in initialUsers
    };

    const result = await api
      .post(`${apiBaseUrl}/users`)
      .send(newUser)
      .expect(409);

    expect(result.body.error.name).to.equal('SequelizeUniqueConstraintError');
    expect(result.body.error.message).to.equal('Some internal DB constraints error or Sequelize error');

    expect(result.body.error.originalError).to.exist;

    const usersAtEnd = await User.findAll({});

    expect(usersAtEnd).to.have.lengthOf(initialUsers.length);
  });

  it('DB Validation checks for user work - incorrect user data fails', async () => {

    const newUserFail1: NewUserBody = {
      username: "Or", // len < 3
      name: 'Dm', // len < 3
      password: 'iwannabeahero',
      phonenumber: '8800', // len < 5, but fails regex too
      email: 'fk1sd', // len < minlength, but fails isEmail too
      birthdate: 'ohI`mNotADateSir!' // !isDate
    };

    const result1 = await api
      .post(`${apiBaseUrl}/users`)
      .send(newUserFail1)
      .expect(400);

    expect(result1.body.error.name).to.equal('SequelizeValidationError');
    expect(result1.body.error.message).to.equal('Some internal DB constraints error or Sequelize error');

    if (result1.body.error.name !== 'SequelizeValidationError') return;

    const validationError1 = result1.body.error.originalError as ValidationError;
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

    const newUserFail2: NewUserBody = {
      username: "Василий", // Russian letters in username regex
      name: '_Dmitry', // Starts with _ regex
      password: 'iwannabeahero',
      phonenumber: '+7-(985)-(500)-32-45', // second -(500) prohibited regex
      email: 'fk@sd.ru', // correct
      birthdate: '23.07.2001 13:12' // !isDate
    };

    const result2 = await api
      .post(`${apiBaseUrl}/users`)
      .send(newUserFail2)
      .expect(400);

    expect(result2.body.error.name).to.equal('SequelizeValidationError');
    expect(result2.body.error.message).to.equal('Some internal DB constraints error or Sequelize error');

    if (result2.body.error.name !== 'SequelizeValidationError') return;

    const validationError2 = result2.body.error.originalError as ValidationError;
    const errorMessages2 = validationError2.errors.map(error => error.message);

    expect(errorMessages2).to.have.members([
      'Validation is on username failed',
      'Validation is on name failed',
      'Validation is on phonenumber failed',
      'Validation isDate on birthdate failed'
    ]);

    const newUserFail3: NewUserBody = {
      username: "_Vasiliy", // Starts with _ regex
      name: 'Василий_', // Ends with _, though russian letters welcome regex
      password: 'iwannabeahero',
      phonenumber: '+7-(985)-500-32-45-12', // just incorrect by regex
      email: 'f@d.u', // len < 6, regex
      birthdate: '2001-07-23_07:31:03.242Z' // !isDate
    };

    const result3 = await api
      .post(`${apiBaseUrl}/users`)
      .send(newUserFail3)
      .expect(400);

    expect(result3.body.error.name).to.equal('SequelizeValidationError');
    expect(result3.body.error.message).to.equal('Some internal DB constraints error or Sequelize error');

    if (result3.body.error.name !== 'SequelizeValidationError') return;

    const validationError3 = result3.body.error.originalError as ValidationError;
    const errorMessages3 = validationError3.errors.map(error => error.message);

    expect(errorMessages3).to.have.members([
      'Validation is on username failed',
      'Validation is on name failed',
      'Validation is on phonenumber failed',
      'Validation is on email failed',
      'Validation len on email failed',
      'Validation isDate on birthdate failed'
    ]);

    const usersAtEnd = await User.findAll({});

    expect(usersAtEnd).to.have.lengthOf(initialUsers.length);

  });

  it('Password length must be in range specified in constants.ts', async () => {
    const newUser: NewUserBody = {
      username: 'Petro',
      name: 'Vasilenko Pyotr Ivanovich',
      password: 'iwbah',
      phonenumber: '89354652288',
      email: 'my-email.vah@jjjjppp.com',
      birthdate: '2001-07-23T07:31:03.242Z',
    };

    const result = await api
      .post(`${apiBaseUrl}/users`)
      .send(newUser)
      .expect(400);

    expect(result.body.error.name).to.equal('PasswordLengthError');
    expect(result.body.error.message).to.equal(`Password must be longer than ${minPasswordLen} and shorter than ${maxPasswordLen} symbols`);

    const usersAtEnd = await User.findAll({});

    expect(usersAtEnd).to.have.lengthOf(initialUsers.length);

  });

  it('Bulk autogenerated correct users add', async () => {

    let added: number = 0;

    const usersInDb = await User.findAll({});

    const usernamesSet = new Set([...usersInDb.map(user => user.username)]);
    const phonenumbersSet = new Set([...usersInDb.map(user => user.phonenumber)]);
    const emailsSet = new Set([...usersInDb.map(user => user.email)]);

    for (let i = 0; i < 10; i++) {
      const newUser: NewUserBody = {
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

        const result = await api
          .post(`${apiBaseUrl}/users`)
          .send(newUser)
          .expect(409);

        expect(result.body.error.name).to.equal('SequelizeUniqueConstraintError');
        expect(result.body.error.message).to.equal('Some internal DB constraints error or Sequelize error');

      } else {

        await api
          .post(`${apiBaseUrl}/users`)
          .send(newUser)
          .expect(201)
          .expect('Content-Type', /application\/json/);

        usernamesSet.add(newUser.username as string);
        phonenumbersSet.add(newUser.phonenumber);
        emailsSet.add(newUser.email as string);

        added++;

      }
    }

    const usersAtEnd = await User.findAll({});

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

      const newUserIncorrect: NewUserBody = {
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

      const result = await api
        .post(`${apiBaseUrl}/users`)
        .send(newUserIncorrect)
        .expect(400);

      expect(result.body.error.name).to.equal('SequelizeValidationError');
      expect(result.body.error.message).to.equal('Some internal DB constraints error or Sequelize error');

      if (result.body.error.name !== 'SequelizeValidationError') return;

      const validationError = result.body.error.originalError as ValidationError;
      const errorMessages = validationError.errors.map(error => error.message);

      expect(errorMessages).to.have.members(Array.from(errorsSet));

    }

    const usersAtEnd = await User.findAll({});

    expect(usersAtEnd).to.have.lengthOf(initialUsers.length);

  }).timeout(30000);

});


describe('User PUT request tests', () => {

  before(async () => {
    await User.destroy({ where: {} });
    await User.bulkCreate(initialUsers);
  });

  beforeEach(async () => {
    await Session.destroy({ where: {} });
    await User.destroy({ where: { id: validUserInDB.dbEntry.id } });
    await User.create(validUserInDB.dbEntry);
  });

  it('A valid request to change user credentials succeds, needs original password', async () => {

    const token = await initLogin(validUserInDB.dbEntry, validUserInDB.password, api, 201, userAgent);

    const updateUserData: EditUserBody = {
      username: 'Ordan',
      name: 'Dmitry Dornichev',
      password: validUserInDB.password,
      newPassword: 'iwannabeaREALhero',
      phonenumber: '89351111356',
      email: 'my-new-email@mail.mail',
      birthdate: '1956-07-23T07:31:03.242Z'
    };

    await api
      .put(`${apiBaseUrl}/users/${validUserInDB.dbEntry.id}`)
      .set({ Authorization: `bearer ${token}` })
      .set('User-Agent', userAgent)
      .send(updateUserData)
      .expect(200)
      .expect('Content-Type', /application\/json/);

    const updatedUserInDB = await User.findOne({ where: { id: validUserInDB.dbEntry.id } });

    if (!updatedUserInDB) return expect(true).to.equal(false);

    expect(updatedUserInDB.username).to.equal(updateUserData.username);
    expect(updatedUserInDB.name).to.equal(updateUserData.name);
    expect(updatedUserInDB.phonenumber).to.equal(updateUserData.phonenumber);
    expect(updatedUserInDB.email).to.equal(updateUserData.email);
    expect(updatedUserInDB.birthdate?.toISOString()).to.equal(updateUserData.birthdate);

    expect(updatedUserInDB.passwordHash).not.to.equal(validUserInDB.dbEntry.passwordHash);

  });

  it('Request to change another user`s data fails', async () => {

    const token = await initLogin(validUserInDB.dbEntry, validUserInDB.password, api, 201, userAgent);

    const updateUserData: EditUserBody = {
      username: 'Ordan',
      name: 'Dmitry Dornichev',
      password: validUserInDB.password,
      newPassword: 'iwannabeaREALhero',
      phonenumber: '89351111356',
      email: 'my-new-email@mail.mail',
      birthdate: '1956-07-23T07:31:03.242Z'
    };

    const responseNonExisting = await api
      .put(`${apiBaseUrl}/users/100500`) // not existing user
      .set({ Authorization: `bearer ${token}` })
      .set('User-Agent', userAgent)
      .send(updateUserData)
      .expect(418)
      .expect('Content-Type', /application\/json/);

    expect(responseNonExisting.body.error.name).to.equal('HackError');
    expect(responseNonExisting.body.error.message).to.equal('User attempts to change another users data or invalid user id');

    const responseAnotherUser = await api
      .put(`${apiBaseUrl}/users/1`) // InitialUsers[0] ? should be
      .set({ Authorization: `bearer ${token}` })
      .set('User-Agent', userAgent)
      .send(updateUserData)
      .expect(418)
      .expect('Content-Type', /application\/json/);

    expect(responseAnotherUser.body.error.name).to.equal('HackError');
    expect(responseAnotherUser.body.error.message).to.equal('User attempts to change another users data or invalid user id');

  });

  it('Request without password fails', async () => {

    const token = await initLogin(validUserInDB.dbEntry, validUserInDB.password, api, 201, userAgent);

    const updateUserData = {
      username: 'Ordan',
      name: 'Dmitry Dornichev',
      newPassword: 'iwannabeaREALhero',
      phonenumber: '89351111356',
      email: 'my-new-email@mail.mail',
      birthdate: '1956-07-23T07:31:03.242Z'
    };

    const response = await api
      .put(`${apiBaseUrl}/users/${validUserInDB.dbEntry.id}`)
      .set({ Authorization: `bearer ${token}` })
      .set('User-Agent', userAgent)
      .send(updateUserData)
      .expect(400)
      .expect('Content-Type', /application\/json/);

    expect(response.body.error.name).to.equal('RequestBodyError');
    expect(response.body.error.message).to.equal('Invalid edit user request body');

  });

});


describe('User GET request tests', () => {

  before(async () => {
    await User.destroy({ where: {} });
    await User.bulkCreate(initialUsers);
    await User.create(validUserInDB.dbEntry);
  });

  beforeEach(async () => {
    await Session.destroy({ where: {} });
  });

  it('A users/me path gives correct user info to frontend', async () => {

    const token = await initLogin(validUserInDB.dbEntry, validUserInDB.password, api, 201, userAgent);

    const response = await api
      .get(`${apiBaseUrl}/users/me`)
      .set({ Authorization: `bearer ${token}` })
      .set('User-Agent', userAgent)
      .expect(200)
      .expect('Content-Type', /application\/json/);

    expect(response.body.id).to.equal(validUserInDB.dbEntry.id);
    expect(response.body.username).to.equal(validUserInDB.dbEntry.username);
    expect(response.body.name).to.equal(validUserInDB.dbEntry.name);
    expect(response.body.phonenumber).to.equal(validUserInDB.dbEntry.phonenumber);
    expect(response.body.email).to.equal(validUserInDB.dbEntry.email);
    expect(response.body.birthdate).to.equal(validUserInDB.dbEntry.birthdate?.toISOString());

  });

  it('A users/me path requires authorization', async () => {

    const response = await api
      .get(`${apiBaseUrl}/users/me`)
      .set('User-Agent', userAgent)
      .expect(401)
      .expect('Content-Type', /application\/json/);

    expect(response.body.error.name).to.equal('AuthorizationError');
    expect(response.body.error.message).to.equal('Authorization required');

  });

});


describe('User addresses requests tests', () => {

  before(async () => {
    await User.destroy({ where: {} });
    await User.bulkCreate(initialUsers);
  });

  beforeEach(async () => {
    await Session.destroy({ where: {} });
    await User.destroy({ where: { id: validUserInDB.dbEntry.id } });
    await User.create(validUserInDB.dbEntry);
    await UserAddress.destroy({ where: {} });
    await Address.destroy({ where: {} });
  });

  it('A valid request to add user address succeeds, user address gets added to junction table', async () => {

    const token = await initLogin(validUserInDB.dbEntry, validUserInDB.password, api, 201, userAgent);

    const responses: Response[] = [];

    for (const address of validAddresses) {
      const response = await api
        .post(`${apiBaseUrl}/users/address`)
        .set({ Authorization: `bearer ${token}` })
        .set('User-Agent', userAgent)
        .send(address)
        .expect(201)
        .expect('Content-Type', /application\/json/);
      responses.push(response);
    }

    const addressesInDB = await Address.findAll({});

    const junctions = await UserAddress.findAll({});

    expect(addressesInDB).to.be.lengthOf(validAddresses.length);
    expect(junctions).to.be.lengthOf(validAddresses.length);

    for (const response of responses) {
      const addressInDB = await Address.findByPk(response.body.id as number);
      expect(addressInDB).to.exist;
      for (const key in response.body) {
        if ((key !== 'createdAt') && (key !== 'updatedAt'))
          expect(response.body[key]).to.equal(addressInDB?.dataValues[key as keyof AddressData]);
      }
      const junction = await UserAddress.findOne({ where: { addressId: addressInDB?.id } });
      expect(junction?.userId).to.equal(validUserInDB.dbEntry.id);
    }

  });

  it('The same address cannot be added twice to the same user. \
If another user adds the same address, the address does not get created, instead a new association is added', async () => {

    const token1 = await initLogin(validUserInDB.dbEntry, validUserInDB.password, api, 201, userAgent);

    await api
      .post(`${apiBaseUrl}/users/address`)
      .set({ Authorization: `bearer ${token1}` })
      .set('User-Agent', userAgent)
      .send(validAddresses[0])
      .expect(201)
      .expect('Content-Type', /application\/json/);

    await api
      .post(`${apiBaseUrl}/users/address`)
      .set({ Authorization: `bearer ${token1}` })
      .set('User-Agent', userAgent)
      .send(validAddresses[0])
      .expect(409)
      .expect('Content-Type', /application\/json/);

    const token2 = await initLogin(initialUsers[0], initialUsersPassword, api, 201, userAgent);

    await api
      .post(`${apiBaseUrl}/users/address`)
      .set({ Authorization: `bearer ${token2}` })
      .set('User-Agent', userAgent)
      .send(validAddresses[0])
      .expect(201)
      .expect('Content-Type', /application\/json/);


    const addressesInDB = await Address.findAll({});

    const junctions = await UserAddress.findAll({});

    expect(addressesInDB).to.be.lengthOf(1);
    expect(junctions).to.be.lengthOf(2);

  });

  it('User address update works correctly, deletes address if no other user uses it, \
does not delete address if somebody or a facility uses it, adds a new address if it did not exist, \
adds only a new junction if it was existing', async () => {

    const token1 = await initLogin(validUserInDB.dbEntry, validUserInDB.password, api, 201, userAgent);
    const token2 = await initLogin(initialUsers[0], initialUsersPassword, api, 201, userAgent);

    const response1 = await api
      .post(`${apiBaseUrl}/users/address`)
      .set({ Authorization: `bearer ${token1}` })
      .set('User-Agent', userAgent)
      .send(validAddresses[0])
      .expect(201)
      .expect('Content-Type', /application\/json/);

    const response2 = await api
      .put(`${apiBaseUrl}/users/address/${response1.body.id}`)
      .set({ Authorization: `bearer ${token1}` })
      .set('User-Agent', userAgent)
      .send(validAddresses[1])
      .expect(201)
      .expect('Content-Type', /application\/json/);

    // To check that response data is valid and updated
    for (const key in response2.body) {
      if ((key !== 'createdAt') && (key !== 'updatedAt') && (key !== 'id'))
        expect(response2.body[key]).to.equal(validAddresses[1][key as keyof NewAddressBody]);
    }

    // To make sure old address is deleted if not used by anybody
    const addressesInDB1 = await Address.findAll({});
    expect(addressesInDB1).to.be.lengthOf(1);

    // To make sure that old junction does not exist
    const junctions1 = await UserAddress.findAll({});
    expect(junctions1[0].userId).to.equal(validUserInDB.dbEntry.id);
    expect(junctions1).to.be.lengthOf(1);

    await api
      .post(`${apiBaseUrl}/users/address`)
      .set({ Authorization: `bearer ${token2}` })
      .set('User-Agent', userAgent)
      .send(validAddresses[1])    // The same address as the one that first user changed to 
      .expect(201)
      .expect('Content-Type', /application\/json/);

    const response4 = await api
      .post(`${apiBaseUrl}/users/address`)
      .set({ Authorization: `bearer ${token2}` })
      .set('User-Agent', userAgent)
      .send(validAddresses[0])    // The previously deleted by first user address
      .expect(201)
      .expect('Content-Type', /application\/json/);

    // Below is strange attempt to edit address data of a new (for this user) address to data of a previous one
    // He should have just deleted the address validAdresses[0], but he is kind of dumb
    // So, this attempt gives 409 and does nothing
    await api
      .put(`${apiBaseUrl}/users/address/${response4.body.id}`)
      .set({ Authorization: `bearer ${token2}` })
      .set('User-Agent', userAgent)
      .send(validAddresses[1])
      .expect(409)
      .expect('Content-Type', /application\/json/);

    // To make sure that first address is added back
    const addressesInDB2 = await Address.findAll({});
    expect(addressesInDB2).to.be.lengthOf(2);

    // To make sure that first user has one junction, and second user has two of them
    const junctions2 = await UserAddress.findAll({});
    expect(junctions2).to.be.lengthOf(3);

  });

});