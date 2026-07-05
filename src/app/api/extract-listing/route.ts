import { NextResponse } from "next/server";
import { z } from "zod";

import { emptyForm } from "@/lib/analysis/form";
import type { AnalysisFormState } from "@/lib/analysis/types";
import {
  attachUploadsToSnapshot,
  ensureConversationSnapshot,
} from "@/lib/conversations/repository";
import { createClient } from "@/lib/supabase/server";
import { extractListingFromImage } from "@/lib/vision/anthropic";
import { mergeImageExtractions } from "@/lib/vision/merge";
import {
  consumeVisionExtractRateLimit,
  VISION_EXTRACT_RATE_LIMIT_MAX,
} from "@/lib/vision/rate-limit";

const MAX_FILES = 20;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const UploadMetadataSchema = z.object({
  conversationId: z.string().uuid().optional(),
  snapshotId: z.string().uuid().optional(),
  form: z.string().optional(),
}).refine((value) => value.conversationId || value.snapshotId, {
  message: "Een conversationId of snapshotId is vereist om uploads te koppelen.",
  path: ["conversationId"],
});
const FormPayloadSchema = z.record(z.string(), z.string());

export const runtime = "nodejs";

function toBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

function normalizeOptionalString(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function sanitizeFileName(value: string): string {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");

  return cleaned || "upload";
}

function parseOptionalFormPayload(raw: string | undefined): AnalysisFormState {
  const fallback = emptyForm();

  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const validated = FormPayloadSchema.safeParse(parsed);

    if (!validated.success) {
      return fallback;
    }

    for (const key of Object.keys(fallback) as Array<keyof AnalysisFormState>) {
      const candidate = validated.data[key];

      if (typeof candidate === "string") {
        fallback[key] = candidate as never;
      }
    }
  } catch {
    return fallback;
  }

  return fallback;
}

function formatResetMoment(resetAt: string): string {
  return new Date(resetAt).toLocaleString("nl-BE", {
    timeZone: "Europe/Brussels",
    dateStyle: "short",
    timeStyle: "short",
  });
}

function normalizeThrownMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues
      .map((issue) => `${issue.path.join(".") || "formData"}: ${issue.message}`)
      .join(" | ");
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Foto-extractie is onverwacht mislukt.";
}

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error:
            "ANTHROPIC_API_KEY ontbreekt op de server. Foto-extractie is tijdelijk niet beschikbaar.",
        },
        { status: 503 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Je moet ingelogd zijn om foto's te laten uitlezen." },
        { status: 401 },
      );
    }

    const contentType = request.headers.get("content-type") ?? "";

    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      return NextResponse.json(
        {
          error:
            "De uploadroute verwacht multipart/form-data met een of meer files-velden.",
        },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const formDataKeys = Array.from(formData.keys());
    const metadata = UploadMetadataSchema.parse({
      conversationId: normalizeOptionalString(formData.get("conversationId")),
      snapshotId: normalizeOptionalString(formData.get("snapshotId")),
      form: normalizeOptionalString(formData.get("form")),
    });
    const currentForm = parseOptionalFormPayload(metadata.form);
    const rawFiles = formData.getAll("files");
    const files = rawFiles
      .filter((value): value is File => value instanceof File);

    if (rawFiles.length === 0) {
      return NextResponse.json(
        {
          error: `Geen bestanden ontvangen in FormData onder "files". Ontvangen velden: ${formDataKeys.join(", ") || "geen"}.`,
        },
        { status: 400 },
      );
    }

    if (files.length === 0) {
      return NextResponse.json(
        {
          error:
            'Het "files"-veld werd ontvangen, maar bevatte geen geldige File-objecten.',
        },
        { status: 400 },
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Upload maximaal ${MAX_FILES} afbeeldingen per extractie.` },
        { status: 400 },
      );
    }

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "Alle uploads moeten afbeeldingsbestanden zijn." },
          { status: 400 },
        );
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: `Elk bestand moet kleiner zijn dan ${Math.floor(
              MAX_FILE_SIZE_BYTES / (1024 * 1024),
            )} MB.`,
          },
          { status: 400 },
        );
      }
    }

    const rateLimit = await consumeVisionExtractRateLimit(supabase);

    if (!rateLimit.allowed) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((new Date(rateLimit.resetAt).getTime() - Date.now()) / 1000),
      );

      return NextResponse.json(
        {
          error: `Je hebt het maximum van ${VISION_EXTRACT_RATE_LIMIT_MAX} foto-extracties per uur bereikt. Probeer opnieuw na ${formatResetMoment(
            rateLimit.resetAt,
          )}.`,
        },
        {
          status: 429,
          headers: {
            "retry-after": String(retryAfterSeconds),
          },
        },
      );
    }

    let resolvedSnapshotId = metadata.snapshotId;
    let createdSnapshot = false;

    if (!resolvedSnapshotId && metadata.conversationId) {
      const snapshot = await ensureConversationSnapshot(supabase, {
        conversationId: metadata.conversationId,
        form: currentForm,
      });

      resolvedSnapshotId = snapshot?.snapshot_id;
      createdSnapshot = snapshot?.created ?? false;
    }

    if (!resolvedSnapshotId) {
      return NextResponse.json(
        { error: "We konden geen snapshot koppelen aan deze upload." },
        { status: 400 },
      );
    }

    const uploadResults = await Promise.all(
      files.map(async (file) => {
        const storagePath = [
          user.id,
          metadata.conversationId ?? resolvedSnapshotId,
          `${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(file.name)}`,
        ].join("/");

        const { error: uploadError } = await supabase.storage
          .from("listing-uploads")
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        return {
          file,
          storagePath,
        };
      }),
    );

    await attachUploadsToSnapshot(supabase, {
      snapshotId: resolvedSnapshotId,
      storagePaths: uploadResults.map((result) => result.storagePath),
    });

    const extractions = await Promise.all(
      uploadResults.map(async (result, index) =>
        extractListingFromImage({
          imageIndex: index,
          base64Data: toBase64(await result.file.arrayBuffer()),
          mediaType: result.file.type,
        }),
      ),
    );

    return NextResponse.json({
      extractions,
      merged: mergeImageExtractions(extractions),
      uploadedStoragePaths: uploadResults.map((result) => result.storagePath),
      linkedToSnapshot: true,
      snapshotId: resolvedSnapshotId,
      createdSnapshot,
    });
  } catch (error) {
    const normalizedMessage = normalizeThrownMessage(error);

    console.error("[extract-listing] Foto-extractie mislukt", {
      error,
      message: normalizedMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: normalizedMessage },
      { status: error instanceof z.ZodError ? 400 : 500 },
    );
  }
}
