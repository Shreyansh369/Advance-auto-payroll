// Creates the first system administrator.
// Usage: npm run create-admin -- "Full Name" email@example.com
import "dotenv/config";
import { createUserWithPassword, generateTemporaryPassword } from "@/lib/users";

async function main() {
  const [name, email] = process.argv.slice(2);
  if (!name || !email) {
    console.error('Usage: npm run create-admin -- "Full Name" email@example.com');
    process.exit(1);
  }
  const password = generateTemporaryPassword();
  await createUserWithPassword({ name, email, password, isSystemAdmin: true, mustChangePassword: true });
  console.log(`Administrator created: ${email}`);
  console.log(`Temporary password:    ${password}`);
  console.log("Sign in, then choose a new password and set up two-factor authentication.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
