require('dotenv').config({ path: `${__dirname}/../.env` });
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const Mill = require('../models/Mill');
const Quality = require('../models/Quality');
const Design = require('../models/Design');
const Stock = require('../models/Stock');
const User = require('../models/User');
const Role = require('../models/Role');

const { ensureDefaultRoles } = require('../controllers/roleController');

const round2 = (value) => Number(value.toFixed(2));

const masterSeed = {
  mills: [
    'Arvind Mills',
    'Raymond Textiles',
    'Vardhman Fabrics',
    'Siyaram Weaves',
    'Oswal Cotton Mills',
    'Prakash Denim Works',
    'Narmada Looms',
    'Ganga Spinners',
  ],
  qualities: [
    'Cotton Premium 60x60',
    'Super Soft 80x80',
    'Blended Everyday',
    'Export Grade Fine',
    'Premium Poplin',
    'Viscose Mix',
  ],
  designs: [
    'PRM-2101',
    'PRM-2184',
    'EXP-3042',
    'CLS-1190',
    'COT-7765',
    'MIX-4420',
    'DNM-5108',
  ],
};

const createMasterDocs = (names) =>
  names.map((name) => ({
    name,
    isActive: true,
    isDeleted: false,
    deletedAt: null,
  }));

const makeRegularStock = ({ index, date, mill, quality, design, lotNo }) => {
  const baleMeters = [
    round2(103.5 + index * 0.9),
    round2(97.25 + index * 0.7),
    round2(110.75 + index * 0.6),
    round2(94.5 + index * 0.5),
    round2(101.25 + index * 0.4),
  ];

  const baleDetails = baleMeters.map((meter, i) => ({
    sNo: i + 1,
    baleNo: `RG-${lotNo}-${String(i + 1).padStart(2, '0')}`,
    meter,
    billNo: i < 2 ? `INV/26-${String(3100 + index * 3 + i).padStart(4, '0')}` : '',
  }));

  const second = round2(3.5 + (index % 3) * 0.5);
  const unchecked = round2(1.75 + (index % 2) * 0.5);
  const baleTotal = round2(baleDetails.reduce((sum, bale) => sum + bale.meter, 0));
  const totalMeterReceived = round2(baleTotal + second + unchecked + 6.25);

  return {
    date,
    millId: mill._id,
    millName: mill.name,
    type: 'regular',
    qualityId: quality._id,
    qualityName: quality.name,
    designId: design._id,
    designName: design.name,
    lotNo,
    totalMeterReceived,
    baleDetails,
    thanDetails: [],
    second,
    unchecked,
    isDeleted: false,
    deletedAt: null,
  };
};

const makeMixStock = ({ index, date, mill, quality, design, lotNo }) => {
  const thanMeters = [
    round2(66.25 + index * 0.45),
    round2(72.4 + index * 0.35),
    round2(70.15 + index * 0.3),
    round2(68.8 + index * 0.25),
    round2(74.35 + index * 0.28),
  ];

  const thanDetails = thanMeters.map((thanMeter, i) => {
    const checked = i < 2 || (i === 2 && index % 2 === 0);
    const billNo = `INV/26-${String(4200 + index * 4 + i).padStart(4, '0')}`;
    const primaryMeter = round2(thanMeter * 0.56);
    const secondaryMeter = round2(thanMeter - primaryMeter);

    return {
      sNo: i + 1,
      thanMeter,
      checked,
      baleDetails: checked
        ? [
            {
              sNo: 1,
              baleNo: `MX-${lotNo}-${String(i + 1).padStart(2, '0')}-A`,
              meter: primaryMeter,
              billNo,
            },
            {
              sNo: 2,
              baleNo: `MX-${lotNo}-${String(i + 1).padStart(2, '0')}-B`,
              meter: secondaryMeter,
              billNo,
            },
          ]
        : [],
    };
  });

  const second = round2(4 + (index % 2) * 1.5);
  const unchecked = round2(2.25 + (index % 3) * 0.5);
  const thanTotal = round2(thanDetails.reduce((sum, than) => sum + than.thanMeter, 0));
  const totalMeterReceived = round2(thanTotal + second + unchecked + 8.4);

  return {
    date,
    millId: mill._id,
    millName: mill.name,
    type: 'mix',
    qualityId: quality._id,
    qualityName: quality.name,
    designId: design._id,
    designName: design.name,
    lotNo,
    totalMeterReceived,
    baleDetails: [],
    thanDetails,
    second,
    unchecked,
    isDeleted: false,
    deletedAt: null,
  };
};

const userSeed = [
  {
    fullName: 'Amit Manihar',
    username: 'admin',
    email: 'admin@maniharenterprise.in',
    password: 'Admin@1234',
    roleKey: 'superadmin',
  },
  {
    fullName: 'Ritika Sharma',
    username: 'ritika.ops',
    email: 'ritika.sharma@maniharenterprise.in',
    password: 'Ritika@123',
    roleKey: 'inventory_manager',
  },
  {
    fullName: 'Vikram Jain',
    username: 'vikram.sales',
    email: 'vikram.jain@maniharenterprise.in',
    password: 'Vikram@123',
    roleKey: 'sales_coordinator',
  },
];

const resetAndSeed = async () => {
  try {
    await connectDB();

    console.log('Clearing existing data...');
    await Promise.all([
      Stock.deleteMany({}),
      User.deleteMany({}),
      Role.deleteMany({}),
      Mill.deleteMany({}),
      Quality.deleteMany({}),
      Design.deleteMany({}),
    ]);

    console.log('Seeding master records...');
    const [mills, qualities, designs] = await Promise.all([
      Mill.insertMany(createMasterDocs(masterSeed.mills)),
      Quality.insertMany(createMasterDocs(masterSeed.qualities)),
      Design.insertMany(createMasterDocs(masterSeed.designs)),
    ]);

    console.log('Seeding default roles...');
    await ensureDefaultRoles();
    const roles = await Role.find({
      key: { $in: userSeed.map((seedUser) => seedUser.roleKey) },
    });
    const roleMap = new Map(roles.map((role) => [role.key, role]));

    console.log('Seeding users...');
    for (const seedUser of userSeed) {
      const role = roleMap.get(seedUser.roleKey);
      if (!role) {
        throw new Error(`Role "${seedUser.roleKey}" not found while seeding users`);
      }

      await User.create({
        fullName: seedUser.fullName,
        username: seedUser.username,
        email: seedUser.email,
        password: seedUser.password,
        roleId: role._id,
        roleKey: role.key,
        roleName: role.name,
        isActive: true,
        mailStatus: 'Not queued',
        permissionOverrides: [],
      });
    }

    console.log('Seeding stock entries...');
    const now = new Date();
    const stocks = [];
    for (let i = 0; i < 14; i += 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - i * 2);

      const mill = mills[i % mills.length];
      const quality = qualities[i % qualities.length];
      const design = designs[i % designs.length];
      const lotNo = 3101 + i;

      if (i % 2 === 0) {
        stocks.push(makeRegularStock({ index: i, date, mill, quality, design, lotNo }));
      } else {
        stocks.push(makeMixStock({ index: i, date, mill, quality, design, lotNo }));
      }
    }
    await Stock.insertMany(stocks);

    console.log('Reset and realistic seed complete.');
    console.log('Seeded users:');
    userSeed.forEach((seedUser) => {
      console.log(`- ${seedUser.username} / ${seedUser.password} (${seedUser.roleKey})`);
    });
    process.exit(0);
  } catch (error) {
    console.error('Error while resetting and seeding data:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

resetAndSeed();
