import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { tournaments, users, type NewUser } from './schema';

/** Seed credentials — also listed in the README. Safe to run repeatedly (idempotent). */
export const SEED_PASSWORDS = { coach: 'Coach@2026', student: 'Player@2026' };

const COACH_EMAIL = 'arjun@kingdomofchess.test';

const SEED_USERS: Omit<NewUser, 'passwordHash'>[] = [
  { email: COACH_EMAIL, name: 'Coach Arjun Mehra', role: 'coach' },
  { email: 'ishaan@kingdomofchess.test', name: 'Ishaan Verma', role: 'student' },
  { email: 'tara@kingdomofchess.test', name: 'Tara Nair', role: 'student' },
  { email: 'vihaan@kingdomofchess.test', name: 'Vihaan Joshi', role: 'student' },
  { email: 'saanvi@kingdomofchess.test', name: 'Saanvi Kapoor', role: 'student' },
  { email: 'advait@kingdomofchess.test', name: 'Advait Rao', role: 'student' },
  { email: 'myra@kingdomofchess.test', name: 'Myra Shah', role: 'student' },
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  await db.transaction(async (tx) => {
    const [coachHash, studentHash] = await Promise.all([
      bcrypt.hash(SEED_PASSWORDS.coach, 10),
      bcrypt.hash(SEED_PASSWORDS.student, 10),
    ]);

    let created = 0;
    for (const u of SEED_USERS) {
      const [existing] = await tx
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.email}) = ${u.email}`);
      if (existing) continue;
      await tx.insert(users).values({ ...u, passwordHash: u.role === 'coach' ? coachHash : studentHash });
      created++;
    }
    console.log(`Users: ${created} created, ${SEED_USERS.length - created} already present`);

    const [coach] = await tx.select().from(users).where(eq(users.email, COACH_EMAIL));

    const sampleTournaments = [
      {
        name: 'Diwali Blitz Arena',
        description: 'Quick 5-minute games. Register, tap "Find opponent" and start playing.',
        baseSeconds: 5 * 60,
        incrementSeconds: 0,
        status: 'open' as const,
        startsAt: new Date(Date.now() + 60 * 60 * 1000),
      },
      {
        name: 'Winter Rapid Championship',
        description: 'Draft — 10+5 rapid championship, registration not open yet.',
        baseSeconds: 10 * 60,
        incrementSeconds: 5,
        status: 'draft' as const,
        startsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
    ];

    let tCreated = 0;
    for (const t of sampleTournaments) {
      const [existing] = await tx
        .select({ id: tournaments.id })
        .from(tournaments)
        .where(eq(tournaments.name, t.name));
      if (existing) continue;
      await tx.insert(tournaments).values({ ...t, createdById: coach.id });
      tCreated++;
    }
    console.log(`Tournaments: ${tCreated} created, ${sampleTournaments.length - tCreated} already present`);
  });

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
