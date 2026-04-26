import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GenerateClient } from "@/app/generate/generate-client";
import { getEnabledImageModels } from "@/lib/models";
import { isGenerationTestingMode } from "@/lib/generation-testing-mode";

export const maxDuration = 120;

export default async function GeneratePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("balance_images").eq("id", user.id).single();

  const models = getEnabledImageModels().map(({ id, label, description }) => ({
    id,
    label,
    description,
  }));

  const testingMode = isGenerationTestingMode();

  return (
    <GenerateClient
      initialBalance={profile?.balance_images ?? 0}
      models={models}
      testingMode={testingMode}
    />
  );
}
