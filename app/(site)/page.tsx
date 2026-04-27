import { createClient } from "@/lib/supabase/server";
import { NanoLanding } from "@/components/landing/NanoLanding";
import { getLandingShowcase } from "@/lib/showcase";
import { isGenerationTestingMode } from "@/lib/generation-testing-mode";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let balance: number | null = null;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("balance_images").eq("id", user.id).single();
    balance = profile?.balance_images ?? null;
  }

  const showcase = await getLandingShowcase();
  const testingMode = isGenerationTestingMode();

  return (
    <NanoLanding
      isLoggedIn={!!user}
      balance={balance}
      showcase={showcase}
      testingMode={testingMode}
    />
  );
}
