import { expect } from 'chai';
import 'mocha';
import { connectToDatabase } from '../db';
import { Address, Facility, LocString, Order, User } from '../models';


await connectToDatabase();


describe('Database Order model tests', () => {

  let facilityNameLoc: LocString;
  let facilityDescriptionLoc: LocString;
  let facilityAddress: Address;
  let facility: Facility;
  let user: User;
  let userAddress: Address;

  before(async () => {
    facilityNameLoc = await LocString.create({
      mainStr: 'тест',
      secStr: 'тест',
      altStr: 'тест'
    });

    facilityDescriptionLoc = await LocString.create({
      mainStr: 'тест',
      secStr: 'тест',
      altStr: 'тест'
    });

    facilityAddress = await Address.create({
      city: 'тест',
      street: 'тест'
    });

    facility = await Facility.create({
      nameLocId: facilityNameLoc.id,
      descriptionLocId: facilityDescriptionLoc.id,
      addressId: facilityAddress.id
    });

    user = await User.create({
      passwordHash: 'testlonger',
      phonenumber: '123123123',
    });

    userAddress = await Address.create({
      city: 'тест2',
      street: 'тест2'
    });
  });

  beforeEach(async () => {
    await Order.destroy({ force: true, where: {} });
  });

  after(async () => {
    await Order.destroy({ force: true, where: {} });
    await User.scope('all').destroy({ force: true, where: {} });
    await LocString.destroy({ force: true, where: {} });
    await Address.destroy({ force: true, where: {} });
    await Facility.destroy({ force: true, where: {} });
  });

  it('Order creation test', async () => {
    
    const order = await Order.create({
      userId: user.id,
      addressId: userAddress.id,
      facilityId: facility.id,
      deliverAt: new Date(),
      status: 'active',
      totalCost: 100,
      archiveAddress: 'тест',
      customerName: 'тест',
      customerPhonenumber: 'тест'
    });

    expect(order).to.exist;

  });

  it('Order update test', async () => {
    
    const order = await Order.create({
      userId: user.id,
      addressId: userAddress.id,
      facilityId: facility.id,
      deliverAt: new Date(),
      status: 'active',
      totalCost: 100,
      archiveAddress: 'тест',
      customerName: 'тест',
      customerPhonenumber: 'тест'
    });

    order.status = 'done';

    await order.save();

    const orderInDB = await Order.findByPk(order.id);

    expect(orderInDB?.status).to.equal('done');

  });

  it('Order delete test', async () => {
    
    const order = await Order.create({
      userId: user.id,
      addressId: userAddress.id,
      facilityId: facility.id,
      deliverAt: new Date(),
      status: 'active',
      totalCost: 100,
      archiveAddress: 'тест',
      customerName: 'тест',
      customerPhonenumber: 'тест'
    });

    await order.destroy();

    const orderInDB = await Order.findByPk(order.id);

    expect(orderInDB).to.not.exist;

  });

  it('Order default scope test: does not include timestamps', async () => {
    
    const order = await Order.create({
      userId: user.id,
      addressId: userAddress.id,
      facilityId: facility.id,
      deliverAt: new Date(),
      status: 'active',
      totalCost: 100,
      archiveAddress: 'тест',
      customerName: 'тест',
      customerPhonenumber: 'тест'
    });

    const orderInDB = await Order.findOne({ where: { id: order.id } });

    expect(orderInDB?.createdAt).to.not.exist;
    expect(orderInDB?.updatedAt).to.not.exist;

  });

});