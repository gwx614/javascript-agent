import { getPrisma } from "./lib/core/db.js";

async function test() {
  try {
    console.log("Testing database connection...");
    const prisma = getPrisma();
    const count = await prisma.user.count();
    console.log("✅ Database connection successful!");
    console.log("User count:", count);
    await prisma.$disconnect();
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }
}

test();
