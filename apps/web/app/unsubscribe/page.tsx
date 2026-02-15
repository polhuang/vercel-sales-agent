import { MailX } from "lucide-react";

export default function UnsubscribePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <MailX size={48} className="mb-4 text-muted-foreground" />
      <h1 className="text-xl font-semibold">You&apos;ve been unsubscribed</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You will no longer receive emails from this campaign.
      </p>
    </div>
  );
}
