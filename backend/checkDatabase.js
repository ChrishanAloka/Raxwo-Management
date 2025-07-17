const mongoose = require('mongoose');
require('dotenv').config();

async function checkDatabase() {
  try {
    console.log('🔍 Checking database contents...');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://marcketDB:echb0TZg1OvloBJE@mandg.iyvr5.mongodb.net/?retryWrites=true&w=majority&appName=MandG';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database');

    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 Collections found:', collections.map(c => c.name));

    for (const collection of collections) {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      console.log(`📊 ${collection.name}: ${count} documents`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

checkDatabase(); 