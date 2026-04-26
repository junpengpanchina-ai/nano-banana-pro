import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GenerateClient } from "@/app/generate/generate-client";
import { getEnabledImageModels } from "@/lib/models";
import { isAnonymousGenerateEnabled, getAnonymousGeneratePoolUserId } from "@/lib/anonymous-generate-mode";
import { isGenerationTestingMode } from "@/lib/generation-testing-mode";

export const maxDuration = 120;

export default async function GeneratePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user
    ? (
        await supabase.from("profiles").select("balance_images").eq("id", user.id).maybeSingle()
      ).data
    : null;

  const models = getEnabledImageModels().map((m) => ({
    id: m.id,
    label: m.label,
    description: m.description,
    allowedImageSizes: m.allowedImageSizes ? [...m.allowedImageSizes] : undefined,
  }));

  const testingMode = isGenerationTestingMode();
  const anonymousGenerateEnabled = isAnonymousGenerateEnabled();
  const poolId = getAnonymousGeneratePoolUserId();

  let initialBalance = profile?.balance_images ?? 0;
  if (!user && anonymousGenerateEnabled && poolId) {
    const admin = createAdminClient();
    const { data: poolProfile } = await admin
      .from("profiles")
      .select("balance_images")
      .eq("id", poolId)
      .maybeSingle();
    initialBalance = poolProfile?.balance_images ?? 0;
  }

  return (
    <GenerateClient
      isLoggedIn={!!user}
      anonymousGenerateEnabled={anonymousGenerateEnabled}
      initialBalance={initialBalance}
      models={models}
      testingMode={testingMode}
    />
  );
}
