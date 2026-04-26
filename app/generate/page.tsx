import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GenerateClient } from "@/app/generate/generate-client";
import { getEnabledImageModels } from "@/lib/models";

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

  const models = getEnabledImageModels().map(({ id, label, description, priceCny }) => ({
    id,
    label,
    description,
    priceCny,
  }));

  return <GenerateClient initialBalance={profile?.balance_images ?? 0} models={models} />;
}
