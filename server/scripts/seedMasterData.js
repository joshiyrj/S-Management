require('dotenv').config({ path: __dirname + '/../.env' });
const connectDB = require('../config/db');
const Mill = require('../models/Mill');
const Quality = require('../models/Quality');
const Design = require('../models/Design');

const masterData = {
  mills: [
    'Lakshmi Mills',
    'Kaveri Textiles',
    'Surya Fabrics',
    'Sree Balaji Looms',
    'Raghav Cotton Works',
  ],
  qualities: [
    'Star',
    'Premium',
    'Classic',
    'Export',
    'Super Soft',
  ],
  designs: [
    'D 101',
    'D 205',
    'F 310',
    'J 412',
    'K 525',
  ],
};

async function upsertNames(Model, names, label) {
  const operations = names.map((name) => ({
    updateOne: {
      filter: { name },
      update: {
        $set: {
          name,
          isActive: true,
          isDeleted: false,
          deletedAt: null,
        },
      },
      upsert: true,
    },
  }));

  await Model.bulkWrite(operations);
  console.log(`${label}: seeded ${names.length} entries`);
}

async function seedMasterData() {
  try {
    await connectDB();

    await upsertNames(Mill, masterData.mills, 'Mills');
    await upsertNames(Quality, masterData.qualities, 'Qualities');
    await upsertNames(Design, masterData.designs, 'Designs');

    console.log('Master data seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding master data:', error);
    process.exit(1);
  }
}

seedMasterData();
