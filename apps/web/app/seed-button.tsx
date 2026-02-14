"use client";

import { useState, useTransition } from "react";
import { Button } from "@sales-agent/ui/components/primitives/button";
import { seedDatabase } from "./actions/seed";
import { Database } from "lucide-react";

export function SeedButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function handleSeed() {
    startTransition(async () => {
      const res = await seedDatabase();
      if (res.skipped) {
        setResult("Data already exists. Seeding skipped.");
      } else {
        setResult(
          `Seeded ${res.accounts} accounts, ${res.opportunities} opportunities, ${res.contacts} contacts.`
        );
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <Button size="sm" onClick={handleSeed} disabled={isPending}>
        <Database size={14} className="mr-1.5" />
        {isPending ? "Seeding..." : "Seed Database"}
      </Button>
      {result && (
        <span className="text-sm text-muted-foreground">{result}</span>
      )}
    </div>
  );
}
