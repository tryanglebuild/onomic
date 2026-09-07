import { OnomicTypingLoader } from "@/components/ui/onomic-typing-loader";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <OnomicTypingLoader />
    </div>
  );
}
