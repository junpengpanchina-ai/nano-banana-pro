"use server";

import { runGenerateImageJob, type GenerateImageResult } from "@/lib/run-generate-image";

export async function submitGenerateImage(prompt: string): Promise<GenerateImageResult> {
  return runGenerateImageJob(prompt);
}
