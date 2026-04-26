import { SignupForm } from "@/app/signup/SignupForm";
import { isGenerationTestingMode } from "@/lib/generation-testing-mode";

export default function SignupPage() {
  return <SignupForm generationTestingMode={isGenerationTestingMode()} />;
}
