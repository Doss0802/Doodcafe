const { MongoClient } = require('mongodb');

const LOCAL_URI = 'mongodb://localhost:27017/Doodcafe';
const ATLAS_URI = 'mongodb+srv://yesudoss0802_db_user:MniTKS0XT34sfo7p@cluster0.eos8oyt.mongodb.net/Doodcafe?appName=Cluster0&retryWrites=true&w=majority';

async function run() {
  // ── Step 1: Test both connections ──────────────────────────────
  console.log('\n1️⃣  Connecting to Local MongoDB (localhost)...');
  const localClient = new MongoClient(LOCAL_URI);
  await localClient.connect();
  const localDb = localClient.db();
  const pingLocal = await localDb.command({ ping: 1 });
  console.log('✅ Local OK:', pingLocal);

  console.log('\n2️⃣  Connecting to MongoDB Atlas Cloud...');
  const atlasClient = new MongoClient(ATLAS_URI, { serverSelectionTimeoutMS: 15000 });
  await atlasClient.connect();
  const atlasDb = atlasClient.db();
  const pingAtlas = await atlasDb.command({ ping: 1 });
  console.log('✅ Atlas OK:', pingAtlas);

  // ── Step 2: Enumerate local collections ────────────────────────
  const collections = (await localDb.listCollections().toArray()).filter(c => !c.name.startsWith('system.'));
  console.log(`\n📋 Local collections (${collections.length}):`, collections.map(c => c.name).join(', '));

  let totalMigrated = 0;

  // ── Step 3: Migrate each collection ────────────────────────────
  for (const colInfo of collections) {
    const name = colInfo.name;
    console.log(`\n══════════════════════════════════════════`);
    console.log(`📦 Migrating: [${name}]`);

    const srcCol = localDb.collection(name);
    const dstCol = atlasDb.collection(name);

    // Read all documents from local
    const docs = await srcCol.find({}).toArray();
    console.log(`   📄 Local documents: ${docs.length}`);

    // Clear destination and insert
    if (docs.length > 0) {
      await dstCol.deleteMany({});
      const result = await dstCol.insertMany(docs, { ordered: false });
      console.log(`   ✅ Inserted: ${result.insertedCount}`);
      totalMigrated += result.insertedCount;
    } else {
      console.log(`   ℹ️ Empty collection — skipping data transfer.`);
    }

    // Verify count matches
    const dstCount = await dstCol.countDocuments();
    const srcCount = docs.length;
    const match = dstCount === srcCount;
    console.log(`   🔍 Integrity check: Local ${srcCount} == Atlas ${dstCount} → ${match ? '✅ PASS' : '❌ MISMATCH'}`);

    // Migrate indexes
    const indexes = await srcCol.indexes();
    let indexCount = 0;
    for (const idx of indexes) {
      if (idx.name === '_id_') continue;
      try {
        const opts = { ...idx };
        delete opts.key; delete opts.v; delete opts.ns;
        await dstCol.createIndex(idx.key, opts);
        indexCount++;
      } catch (e) {
        console.log(`   ⚠️ Index "${idx.name}": ${e.message}`);
      }
    }
    console.log(`   🔑 Indexes replicated: ${indexCount}/${indexes.length - 1}`);
  }

  // ── Step 4: Atlas summary ───────────────────────────────────────
  console.log('\n══════════════════════════════════════════');
  console.log('📊 ATLAS POST-MIGRATION VERIFICATION:');
  const atlasCols = (await atlasDb.listCollections().toArray()).filter(c => !c.name.startsWith('system.'));
  let totalAtlas = 0;
  for (const c of atlasCols) {
    const count = await atlasDb.collection(c.name).countDocuments();
    totalAtlas += count;
    console.log(`   📦 "${c.name}": ${count} documents`);
  }
  console.log(`   ── Total in Atlas: ${totalAtlas} documents across ${atlasCols.length} collections`);

  // ── Step 5: Drop local database ────────────────────────────────
  console.log('\n🗑️  Dropping local Doodcafe database to free space...');
  await localDb.dropDatabase();
  console.log('✅ Local database [Doodcafe] dropped successfully.');

  // Close connections
  await localClient.close();
  await atlasClient.close();

  console.log('\n══════════════════════════════════════════');
  console.log(`🎉 Migration complete! ${totalMigrated} documents safely transferred to Atlas.`);
  console.log('   Local MongoDB is now clean and free.');
  console.log('══════════════════════════════════════════\n');
  process.exit(0);
}

run().catch(err => {
  console.error('\n❌ Error:', err.code || '', err.codeName || '', '-', err.message);
  if (err.code === 8000 || (err.message && err.message.includes('bad auth'))) {
    console.error('\n🔑 Authentication failed. Please verify in Atlas Dashboard:');
    console.error('   1. Security → Database Access → Check username/password');
    console.error('   2. Security → Network Access → Add 0.0.0.0/0 or your current IP');
  }
  process.exit(1);
});
