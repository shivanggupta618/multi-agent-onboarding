import { storeCase } from './db.js';
import { presetCases } from './sample.js';

console.log('Seeding synthetic onboarding cases into SQLite database...');

const cases = presetCases();
for (const c of cases) {
  storeCase(c);
  console.log(`- Seeded case: ${c.name} (${c.id})`);
}

console.log('Database seeding completed successfully.');
