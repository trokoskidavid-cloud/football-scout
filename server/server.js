require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const app = require('./app');
const { connectDb } = require('./config/db');
const { seedDatabase } = require('./seed/seed');
const Player = require('./models/player');

const PORT = process.env.PORT || 3000;

(async () => {
  await connectDb();
  if (process.env.SEED_ON_START === 'true' && (await Player.estimatedDocumentCount()) === 0) {
    console.log('[seed] Empty database – inserting initial data', await seedDatabase());
  }
  app.listen(PORT, () => {
    console.log(`FootballScout running on http://localhost:${PORT}`);
    console.log(`API docs: http://localhost:${PORT}/api/docs`);
  });
})().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});
