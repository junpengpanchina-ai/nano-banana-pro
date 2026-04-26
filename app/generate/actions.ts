"use server";

import { runGenerateImageJob, type GenerateImageResult } from "@/lib/run-generate-image";

export async function submitGenerateImage(
  prompt: string,
  modelId: string,
  testNote?: string | null,
  aspectRatio?: string | null,
  imageSize?: string | null,
): Promise<GenerateImageResult> {
  return runGenerateImageJob(prompt, modelId, testNote, { aspectRatio, imageSize });
}
