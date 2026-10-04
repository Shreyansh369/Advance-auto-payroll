// Runs against a real Postgres database. Set TEST_DATABASE_URL to a disposable database:
// its contents are wiped and migrations re-applied. Skipped when not set.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "@/db/schema";
import { getRole, listMemberships } from "@/lib/tenancy";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("database", () => {
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  const ids = { alice: "test-alice", bob: "test-bob", acme: "", globex: "" };

  beforeAll(async () => {
    // The audit log can't be truncated by design, so start from an empty schema.
    await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;`);
    await migrate(db, { migrationsFolder: "drizzle" });
    await db.insert(schema.user).values([
      { id: ids.alice, name: "Alice", email: "alice@test.local" },
      { id: ids.bob, name: "Bob", email: "bob@test.local" },
    ]);
    const [acme, globex] = await db.insert(schema.company).values([{ name: "Acme" }, { name: "Globex" }]).returning();
    ids.acme = acme.id;
    ids.globex = globex.id;
    await db.insert(schema.companyMembership).values([
      { companyId: acme.id, userId: ids.alice, role: "owner" },
      { companyId: globex.id, userId: ids.bob, role: "viewer" },
    ]);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("lists only the companies a user belongs to", async () => {
    const alice = await listMemberships(ids.alice, db);
    expect(alice.map((m) => m.companyName)).toEqual(["Acme"]);
    const bob = await listMemberships(ids.bob, db);
    expect(bob.map((m) => m.companyName)).toEqual(["Globex"]);
  });

  it("gives no role in another user's company", async () => {
    expect(await getRole(ids.alice, ids.acme, db)).toBe("owner");
    expect(await getRole(ids.alice, ids.globex, db)).toBeNull();
    expect(await getRole(ids.bob, ids.acme, db)).toBeNull();
    expect(await getRole(ids.bob, "not-a-uuid", db)).toBeNull();
  });

  it("prevents editing or deleting audit entries", async () => {
    await db.insert(schema.auditLog).values({ action: "test.event", entityType: "test", companyId: ids.acme });
    for (const statement of [sql`UPDATE audit_log SET action = 'tampered'`, sql`DELETE FROM audit_log`, sql`TRUNCATE audit_log`]) {
      const error = await db.execute(statement).then(
        () => null,
        (e: Error) => e,
      );
      expect(String((error?.cause as Error | undefined)?.message)).toMatch(/append-only/);
    }
  });
});
