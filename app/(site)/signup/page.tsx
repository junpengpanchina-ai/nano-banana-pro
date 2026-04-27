import { SignupForm } from "@/app/signup/SignupForm";
import { isGenerationTestingMode } from "@/lib/generation-testing-mode";
import { safeInternalPath } from "@/lib/safe-redirect-path";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = safeInternalPath(sp.next, "/generate");
  return (
    <SignupForm generationTestingMode={isGenerationTestingMode()} redirectAfterSignup={next} />
  );
}
