import { sanitizeHeroImageCandidateErrorMessage } from "./service-utils.js";
import type {
  HeroImageCandidateStorage,
  HeroImageCandidateStorageUploadInput,
  HeroImageCandidateStorageUploadResult,
} from "./types.js";

export interface SupabaseHeroImageCandidateStorageOptions {
  readonly supabaseUrl?: string;
  readonly serviceRoleKey?: string;
  readonly fetch?: typeof fetch;
}

export class HeroImageCandidateStorageError extends Error {
  constructor(message: string) {
    super(sanitizeHeroImageCandidateErrorMessage(message));
    this.name = "HeroImageCandidateStorageError";
  }
}

export function createSupabaseHeroImageCandidateStorage(
  options: SupabaseHeroImageCandidateStorageOptions = {},
): HeroImageCandidateStorage {
  const supabaseUrl = (options.supabaseUrl ?? process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const serviceRoleKey = options.serviceRoleKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const fetchImpl = options.fetch ?? globalThis.fetch;

  if (supabaseUrl.length === 0) {
    throw new HeroImageCandidateStorageError("Missing SUPABASE_URL for hero image candidate storage.");
  }

  if (serviceRoleKey.length === 0) {
    throw new HeroImageCandidateStorageError(
      "Missing SUPABASE_SERVICE_ROLE_KEY for hero image candidate storage.",
    );
  }

  if (fetchImpl === undefined) {
    throw new HeroImageCandidateStorageError("Global fetch is unavailable for Supabase Storage uploads.");
  }

  return {
    upload: (input) => uploadToSupabaseStorage(fetchImpl, supabaseUrl, serviceRoleKey, input),
  };
}

async function uploadToSupabaseStorage(
  fetchImpl: typeof fetch,
  supabaseUrl: string,
  serviceRoleKey: string,
  input: HeroImageCandidateStorageUploadInput,
): Promise<HeroImageCandidateStorageUploadResult> {
  const response = await fetchImpl(
    `${supabaseUrl}/storage/v1/object/${encodeURIComponent(input.bucket)}/${encodeStoragePath(input.path)}`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "cache-control": "public, max-age=31536000, immutable",
        "content-type": input.contentType,
        "x-upsert": "false",
      },
      body: Buffer.from(input.bytes),
    },
  );

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    throw new HeroImageCandidateStorageError(
      `Supabase Storage upload failed with HTTP ${response.status}: ${responseText}`,
    );
  }

  return {
    bucket: input.bucket,
    path: input.path,
    publicUrl: `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(input.bucket)}/${encodeStoragePath(input.path)}`,
    contentType: input.contentType,
    sizeBytes: input.bytes.byteLength,
  };
}

function encodeStoragePath(path: string): string {
  return path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}
