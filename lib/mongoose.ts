import mongoose from "mongoose";
import { ALL_MODELS, Category, Setting } from "./models";
import { seedDemo } from "./seed";
import {
  MONGODB_DB_NAME,
  MONGODB_MAX_POOL_SIZE,
  MONGODB_SERVER_SELECTION_TIMEOUT_MS,
} from "./config";

type Cache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  ready: Promise<void> | null;
};

const g = globalThis as unknown as { __snsMongoose?: Cache };

function cache(): Cache {
  if (!g.__snsMongoose) {
    g.__snsMongoose = { conn: null, promise: null, ready: null };
  }
  return g.__snsMongoose;
}

/**
 * Builds the Atlas connection string. `MONGODB_URI` wins when provided;
 * otherwise the URI is assembled from the separate credential variables so
 * secrets never need to be duplicated into a pasted connection string.
 */
function uri(): string {
  const explicit = process.env.MONGODB_URI?.trim();
  if (explicit) return explicit;

  const user = process.env.MONGODB_USER?.trim();
  const password = process.env.MONGODB_PASSWORD?.trim();
  const hosts = process.env.MONGODB_HOSTS?.trim();
  const host = process.env.MONGODB_HOST?.trim();

  if (user && password && hosts) {
    // Direct seed list — used where SRV lookups are blocked by a local resolver.
    return `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${hosts}/?authSource=admin&tls=true&retryWrites=true&w=majority`;
  }

  if (user && password && host) {
    return `mongodb+srv://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}/?retryWrites=true&w=majority`;
  }

  throw new Error(
    "MongoDB is not configured. Set MONGODB_URI, or MONGODB_USER + " +
      "MONGODB_PASSWORD + MONGODB_HOST, in .env.local (and in the deployment " +
      "environment).",
  );
}

/** Opens (or reuses) the shared Mongoose connection. */
export async function connectDb(): Promise<typeof mongoose> {
  const state = cache();
  if (state.conn) return state.conn;

  if (!state.promise) {
    state.promise = mongoose.connect(uri(), {
      dbName: MONGODB_DB_NAME,
      bufferCommands: false,
      maxPoolSize: MONGODB_MAX_POOL_SIZE,
      serverSelectionTimeoutMS: MONGODB_SERVER_SELECTION_TIMEOUT_MS,
    });
  }

  try {
    state.conn = await state.promise;
    return state.conn;
  } catch (error) {
    state.promise = null;
    throw error;
  }
}

/** Connects, creates indexes once per process and seeds a fresh database. */
export async function ready(): Promise<void> {
  const state = cache();
  if (state.ready) return state.ready;

  state.ready = (async () => {
    await connectDb();
    await Promise.all(ALL_MODELS.map((Model) => Model.init()));
    await ensureSeed();
  })().catch((error) => {
    state.ready = null;
    throw error;
  });

  return state.ready;
}

async function ensureSeed(): Promise<void> {
  const existing = await Category.countDocuments();
  if (existing > 0) {
    await Setting.updateOne(
      { _id: "__seeded" },
      { $setOnInsert: { value: "1" } },
      { upsert: true },
    );
    return;
  }

  if (process.env.SEED_DEMO_DATA === "false") return;

  const claim = await Setting.findOneAndUpdate(
    { _id: "__seeded" },
    { $setOnInsert: { value: "1" } },
    { upsert: true, new: false, includeResultMetadata: true },
  );

  const updatedExisting = Boolean(
    (claim as any)?.lastErrorObject?.updatedExisting,
  );
  if (updatedExisting) return;

  try {
    await seedDemo();
  } catch (error) {
    await Setting.deleteOne({ _id: "__seeded" }).catch(() => undefined);
    throw error;
  }
}

/**
 * Runs a callback inside a MongoDB multi-document transaction. Atlas clusters
 * are replica sets, so this works on the free M0 tier too.
 */
export async function withTransaction<T>(
  fn: (session: mongoose.ClientSession) => Promise<T>,
): Promise<T> {
  await ready();
  const conn = cache().conn;
  if (!conn) throw new Error("Database connection is not ready.");
  return conn.connection.transaction(fn) as Promise<T>;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(
    process.env.MONGODB_URI?.trim() ||
      (process.env.MONGODB_USER?.trim() &&
        process.env.MONGODB_PASSWORD?.trim() &&
        (process.env.MONGODB_HOSTS?.trim() || process.env.MONGODB_HOST?.trim())),
  );
}
