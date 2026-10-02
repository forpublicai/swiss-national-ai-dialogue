import crypto from "crypto";

import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { snadAccessKeys } from "./db-schema";

const KEY_PREFIX = "snadk_";

export type AccessKeySummary = {
  id: string;
  label: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
};

function hashKey(plaintext: string): string {
  return crypto.createHash("sha256").update(plaintext).digest("hex");
}

function generateKey(): string {
  return `${KEY_PREFIX}${crypto.randomBytes(24).toString("base64url")}`;
}

export async function listAccessKeys(): Promise<AccessKeySummary[]> {
  return db
    .select({
      id: snadAccessKeys.id,
      label: snadAccessKeys.label,
      createdAt: snadAccessKeys.createdAt,
      lastUsedAt: snadAccessKeys.lastUsedAt,
      revokedAt: snadAccessKeys.revokedAt,
    })
    .from(snadAccessKeys)
    .orderBy(desc(snadAccessKeys.createdAt));
}

export async function createAccessKey(
  label: string,
): Promise<{ id: string; label: string; key: string }> {
  const key = generateKey();
  const [row] = await db
    .insert(snadAccessKeys)
    .values({ label: label.trim(), keyHash: hashKey(key) })
    .returning({ id: snadAccessKeys.id, label: snadAccessKeys.label });
  return { id: row!.id, label: row!.label, key };
}

// Soft-delete: returns false if the id is unknown or already revoked.
export async function revokeAccessKey(id: string): Promise<boolean> {
  const [row] = await db
    .update(snadAccessKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(snadAccessKeys.id, id), isNull(snadAccessKeys.revokedAt)))
    .returning({ id: snadAccessKeys.id });
  return Boolean(row);
}

export async function verifyAccessKey(
  plaintext: string,
): Promise<{ keyId: string; keyName: string } | null> {
  const [row] = await db
    .update(snadAccessKeys)
    .set({ lastUsedAt: new Date() })
    .where(
      and(
        eq(snadAccessKeys.keyHash, hashKey(plaintext)),
        isNull(snadAccessKeys.revokedAt),
      ),
    )
    .returning({ id: snadAccessKeys.id, label: snadAccessKeys.label });
  if (!row) return null;
  return { keyId: row.id, keyName: row.label };
}

// Per-request revocation re-check for an already-issued session.
export async function isAccessKeyActive(keyId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: snadAccessKeys.id })
    .from(snadAccessKeys)
    .where(and(eq(snadAccessKeys.id, keyId), isNull(snadAccessKeys.revokedAt)))
    .limit(1);
  return Boolean(row);
}
