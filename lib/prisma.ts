import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  if (process.env.NODE_ENV === "production" && process.env.NETLIFY) {
    console.log("Setting up Prisma with Neon adapter for Netlify production");

    try {
      const { neonConfig } = require("@neondatabase/serverless");
      const { Pool } = require("@neondatabase/serverless");
      const { PrismaNeon } = require("@prisma/adapter-neon");

      neonConfig.fetchConnectionCache = true;

      const connectionString = process.env.NETLIFY_DATABASE_URL;

      if (!connectionString) {
        console.error("NETLIFY_DATABASE_URL is not set");
        throw new Error(
          "NETLIFY_DATABASE_URL environment variable is required"
        );
      }

      console.log(
        "Using Neon adapter with connection string:",
        connectionString.substring(0, 20) + "..."
      );

      const pool = new Pool({ connectionString });
      const adapter = new PrismaNeon(pool);

      return new PrismaClient({
        adapter,
        log: ["error"],
      });
    } catch (error) {
      console.error("Failed to setup Neon adapter:", error);
    }
  }

  const databaseUrl =
    process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

  if (!databaseUrl) {
    console.error(
      "No database URL found. Checked DATABASE_URL and NETLIFY_DATABASE_URL"
    );
    throw new Error("Database URL environment variable is required");
  }

  console.log(
    "Using standard PrismaClient with database URL:",
    databaseUrl.substring(0, 20) + "..."
  );

  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

let neonSql: any = null;

if (process.env.NODE_ENV === "production" && process.env.NETLIFY) {
  try {
    const { neon } = require("@neondatabase/serverless");
    const connectionString = process.env.NETLIFY_DATABASE_URL;
    if (connectionString) {
      neonSql = neon(connectionString);
    }
  } catch (error) {
    console.warn("Neon direct SQL not available:", error);
  }
}

export { neonSql };
