/**
 * Data Migration Script: WeChat Cloud Development → MongoDB
 *
 * Prerequisites:
 * - MONGODB_URI environment variable set
 * - WeChat Cloud Development credentials configured
 * - Image files in WeChat Cloud Storage need to be re-uploaded to R2
 *
 * Usage:
 *   npx tsx scripts/migrate-from-wechat.ts
 *
 * Environment variables:
 *   MONGODB_URI          - MongoDB connection string
 *   WECHAT_ENV_ID        - WeChat Cloud environment ID
 *   WECHAT_CREDENTIALS   - WeChat Cloud credentials JSON
 *   R2_ENDPOINT          - Cloudflare R2 endpoint
 *   R2_ACCESS_KEY        - Cloudflare R2 access key
 *   R2_SECRET_KEY        - Cloudflare R2 secret key
 *   R2_BUCKET_NAME       - Cloudflare R2 bucket name
 */

import mongoose from "mongoose";
import fs from "fs";
import path from "path";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI environment variable is required");
  process.exit(1);
}

interface MigrationStats {
  diagrams: { total: number; migrated: number; failed: number };
  myDiagrams: { total: number; migrated: number; failed: number };
  favorites: { total: number; migrated: number; failed: number };
  tags: { total: number; migrated: number; failed: number };
  images: { downloaded: number; uploaded: number; failed: number };
}

const stats: MigrationStats = {
  diagrams: { total: 0, migrated: 0, failed: 0 },
  myDiagrams: { total: 0, migrated: 0, failed: 0 },
  favorites: { total: 0, migrated: 0, failed: 0 },
  tags: { total: 0, migrated: 0, failed: 0 },
  images: { downloaded: 0, uploaded: 0, failed: 0 },
};

/**
 * Read WeChat Cloud data from local backup files (exported via WeChat Cloud Console)
 * or connect directly via WeChat Cloud SDK.
 */
async function readWeChatData() {
  const dataDir = path.join(__dirname, "..", "wechat-backup");
  const collections = ["diagrams", "my_diagrams", "favorites", "tags"];

  if (!fs.existsSync(dataDir)) {
    console.log(`WeChat backup directory not found at ${dataDir}`);
    console.log("Expected structure:");
    console.log("  wechat-backup/");
    console.log("    diagrams/    - JSON files for each document");
    console.log("    my_diagrams/ - JSON files for each document");
    console.log("    favorites/   - JSON files for each document");
    console.log("    tags/        - JSON files for each document");
    console.log("\nTo export data from WeChat Cloud:");
    console.log("1. Go to WeChat Cloud Console > Database > Export");
    console.log("2. Export each collection as JSON");
    console.log("3. Place files in the wechat-backup/ directory");
    process.exit(0);
  }

  const data: Record<string, any[]> = {};
  for (const coll of collections) {
    const collDir = path.join(dataDir, coll);
    if (fs.existsSync(collDir)) {
      const files = fs.readdirSync(collDir).filter((f) => f.endsWith(".json"));
      data[coll] = files.map((f) => {
        const content = fs.readFileSync(path.join(collDir, f), "utf-8");
        return JSON.parse(content);
      });
      console.log(`  ${coll}: ${data[coll].length} documents`);
    } else {
      data[coll] = [];
      console.log(`  ${coll}: 0 documents (directory not found)`);
    }
  }
  return data;
}

/**
 * Transform WeChat Cloud document to MongoDB document
 */
function transformDiagram(doc: any): any {
  return {
    _id: doc._id,
    userId: doc._openid || "migrated",
    userName: doc.userName || doc._openid || "Unknown",
    name: doc.title || doc.name || "Untitled",
    description: doc.description || "",
    imageUrl: doc.fileURL || doc.imageUrl || "",
    thumbnailUrl: doc.thumbnailURL || doc.thumbnailUrl || "",
    width: doc.width || 0,
    height: doc.height || 0,
    pixels: doc.pixels || [],
    brand: doc.colorSystem || "MARD",
    tags: doc.tags || [],
    colorCount: doc.colorCount || doc.cellCount || 0,
    isPublic: true,
    viewCount: doc.viewCount || 0,
    favoriteCount: doc.favoriteCount || 0,
    createdAt: new Date(doc.createdAt || Date.now()),
    updatedAt: new Date(doc.updatedAt || doc.createdAt || Date.now()),
  };
}

function transformMyDiagram(doc: any): any {
  return {
    _id: doc._id,
    userId: doc._openid || "migrated",
    name: doc.title || doc.name || "Untitled",
    imageUrl: doc.fileURL || doc.imageUrl || "",
    thumbnailUrl: doc.thumbnailURL || doc.thumbnailUrl || "",
    width: doc.width || 0,
    height: doc.height || 0,
    pixels: doc.pixels || [],
    brand: doc.colorSystem || "MARD",
    colorCount: doc.colorCount || doc.cellCount || 0,
    createdAt: new Date(doc.createdAt || Date.now()),
    updatedAt: new Date(doc.updatedAt || doc.createdAt || Date.now()),
  };
}

function transformFavorite(doc: any): any {
  return {
    userId: doc._openid || "migrated",
    diagramId: doc.diagramId || doc._id,
    diagramSnapshot: {
      name: doc.diagramSnapshot?.name || "",
      imageUrl: doc.diagramSnapshot?.imageUrl || "",
      thumbnailUrl: doc.diagramSnapshot?.thumbnailUrl || "",
      userName: doc.diagramSnapshot?.userName || "",
      width: doc.diagramSnapshot?.width || 0,
      height: doc.diagramSnapshot?.height || 0,
    },
    createdAt: new Date(doc.createdAt || Date.now()),
  };
}

function transformTag(doc: any): any {
  return {
    _id: doc._id,
    name: doc.name,
    slug: doc.name?.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || doc._id,
    color: doc.color || undefined,
    diagramCount: doc.diagramCount || 0,
    sortOrder: doc.sortOrder || 0,
    isActive: true,
    createdAt: new Date(doc.createdAt || Date.now()),
    updatedAt: new Date(doc.updatedAt || doc.createdAt || Date.now()),
  };
}

async function migrate() {
  console.log("=== Pindou Data Migration ===\n");

  // Connect to MongoDB
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI!);
  console.log("Connected to MongoDB\n");

  // Read WeChat data
  console.log("Reading WeChat Cloud data...");
  const wechatData = await readWeChatData();
  console.log();

  // Migrate diagrams
  console.log("Migrating diagrams...");
  for (const doc of wechatData.diagrams || []) {
    try {
      const transformed = transformDiagram(doc);
      await mongoose.connection.db!
        .collection("diagrams")
        .replaceOne({ _id: transformed._id }, transformed, { upsert: true });
      stats.diagrams.migrated++;
    } catch (err) {
      console.error(`  Failed to migrate diagram ${doc._id}:`, err);
      stats.diagrams.failed++;
    }
    stats.diagrams.total++;
  }
  console.log(`  Done: ${stats.diagrams.migrated} migrated, ${stats.diagrams.failed} failed\n`);

  // Migrate my_diagrams
  console.log("Migrating my_diagrams...");
  for (const doc of wechatData.my_diagrams || []) {
    try {
      const transformed = transformMyDiagram(doc);
      await mongoose.connection.db!
        .collection("mydiagrams")
        .replaceOne({ _id: transformed._id }, transformed, { upsert: true });
      stats.myDiagrams.migrated++;
    } catch (err) {
      console.error(`  Failed to migrate my_diagram ${doc._id}:`, err);
      stats.myDiagrams.failed++;
    }
    stats.myDiagrams.total++;
  }
  console.log(`  Done: ${stats.myDiagrams.migrated} migrated, ${stats.myDiagrams.failed} failed\n`);

  // Migrate favorites
  console.log("Migrating favorites...");
  for (const doc of wechatData.favorites || []) {
    try {
      const transformed = transformFavorite(doc);
      // Use a deterministic _id for upsert
      const favId = `${transformed.userId}_${transformed.diagramId}`;
      await mongoose.connection.db!
        .collection("favorites")
        .replaceOne({ _id: favId as any }, { ...transformed, _id: favId as any }, { upsert: true });
      stats.favorites.migrated++;
    } catch (err) {
      console.error(`  Failed to migrate favorite:`, err);
      stats.favorites.failed++;
    }
    stats.favorites.total++;
  }
  console.log(`  Done: ${stats.favorites.migrated} migrated, ${stats.favorites.failed} failed\n`);

  // Migrate tags
  console.log("Migrating tags...");
  for (const doc of wechatData.tags || []) {
    try {
      const transformed = transformTag(doc);
      await mongoose.connection.db!
        .collection("tags")
        .replaceOne({ _id: transformed._id }, transformed, { upsert: true });
      stats.tags.migrated++;
    } catch (err) {
      console.error(`  Failed to migrate tag ${doc._id}:`, err);
      stats.tags.failed++;
    }
    stats.tags.total++;
  }
  console.log(`  Done: ${stats.tags.migrated} migrated, ${stats.tags.failed} failed\n`);

  // Summary
  console.log("=== Migration Summary ===");
  console.log(`Diagrams:     ${stats.diagrams.migrated}/${stats.diagrams.total}`);
  console.log(`My Diagrams:  ${stats.myDiagrams.migrated}/${stats.myDiagrams.total}`);
  console.log(`Favorites:    ${stats.favorites.migrated}/${stats.favorites.total}`);
  console.log(`Tags:         ${stats.tags.migrated}/${stats.tags.total}`);
  console.log("\nMigration complete!");

  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});