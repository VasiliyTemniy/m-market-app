import type { UiSettingDT, UiSettingDTN } from '@m-market-app/models';
import { expect } from 'chai';
import 'mocha';
import supertest from 'supertest';
import app from '../app';
import { createAdmin, validAdminInDB } from './admin_api_helper';
import { initLogin, userAgent } from './sessions_api_helper';
import { apiBaseUrl } from './test_helper';
import { createUser, validUserInDB } from './user_api_helper';
import { authController, sessionService, uiSettingService, userService } from '../controllers';


const api = supertest(app);


describe('UiSetting requests tests', () => {

  let tokenCookie: string;
  let uiSettings: UiSettingDT[];

  before(async () => {
    const keepSuperAdmin = true;
    await userService.removeAll(keepSuperAdmin);

    await authController.flushExternalDB();
    const admin = await createAdmin(validAdminInDB.dtn);
    await sessionService.removeAll();
    tokenCookie = await initLogin(admin, validAdminInDB.password, api, 201, userAgent) as string;

    uiSettings = await uiSettingService.reset();
  });

  after(async () => {
    await uiSettingService.removeAll();
  });

  it('UiSetting GET / route work without authorization and give only non-falsy uiSettings', async () => {

    const nonFalsyUiSettings = uiSettings.filter(uiSetting => uiSetting.value !== 'false');

    const response = await api
      .get(`${apiBaseUrl}/ui-setting`)
      .set('User-Agent', userAgent)
      .expect(200)
      .expect('Content-Type', /application\/json/);

    expect(response.body).to.be.lengthOf(nonFalsyUiSettings.length);
    expect(response.body.length).to.be.lessThan(uiSettings.length);

  });

  it('UiSetting GET routes give all uiSettings including falsy if logged user is admin', async () => {

    const response1 = await api
      .get(`${apiBaseUrl}/ui-setting/${uiSettings[0].id}`)
      .set('Cookie', [tokenCookie])
      .set('User-Agent', userAgent)
      .expect(200)
      .expect('Content-Type', /application\/json/);

    const uiSettingInDB = await uiSettingService.getById(uiSettings[0].id);

    expect(response1.body.name).to.equal(uiSettingInDB?.name);
    expect(response1.body.value).to.equal(uiSettingInDB?.value);

    const response2 = await api
      .get(`${apiBaseUrl}/ui-setting`)
      .set('Cookie', [tokenCookie])
      .set('User-Agent', userAgent)
      .expect(200)
      .expect('Content-Type', /application\/json/);

    expect(response2.body).to.be.lengthOf(uiSettings.length);

  });

  it('UiSetting PUT routes require admin rights', async () => {

    const response1 = await api
      .put(`${apiBaseUrl}/ui-setting/${uiSettings[0].id}`)
      .set('User-Agent', userAgent)
      .send({ some: 'crap' })
      .expect(401)
      .expect('Content-Type', /application\/json/);

    expect(response1.body.error.name).to.equal('AuthorizationError');

    const customer = await createUser(validUserInDB.dtn);

    const commonUserTokenCookie = await initLogin(customer, validUserInDB.password, api, 201, userAgent) as string; 

    const response2 = await api
      .put(`${apiBaseUrl}/ui-setting/${uiSettings[0].id}`)
      .set('Cookie', [commonUserTokenCookie])
      .set('User-Agent', userAgent)
      .send({ some: 'crap' })
      .expect(403)
      .expect('Content-Type', /application\/json/);

    expect(response2.body.error.name).to.equal('ProhibitedError');

  });

  it('UiSetting PUT /:id updates uiSetting data, can be used by admin', async () => {

    const updUiSetting: UiSettingDTN = {
      name: 'editTest', // ui settings names must be unmutable, so the name does not get changed even if put for correct ui setting id
      value: 'editTestValue',
      theme: 'light',
      group: 'input',
    };

    const response = await api
      .put(`${apiBaseUrl}/ui-setting/${uiSettings[0].id}`)
      .set('Cookie', [tokenCookie])
      .set('User-Agent', userAgent)
      .send(updUiSetting)
      .expect(200)
      .expect('Content-Type', /application\/json/);

    const updUiSettingInDB = await uiSettingService.getById(uiSettings[0].id);

    expect(response.body.name).to.not.equal(updUiSetting.name);
    expect(response.body.name).to.equal(uiSettings[0].name);
    expect(response.body.value).to.equal(updUiSetting.value);


    expect(updUiSettingInDB?.name).to.not.equal(updUiSetting.name);
    expect(updUiSettingInDB?.name).to.equal(uiSettings[0].name);
    expect(updUiSettingInDB?.value).to.equal(updUiSetting.value);

  });

});