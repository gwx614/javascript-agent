"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RagManager } from "@/components/rag/RagManager";
import { BookOpen, FileText, Trash2, Loader2 } from "lucide-react";

export default function RagPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"documents" | "knowledge" | "settings">("documents");

  return (
    <div className="flex h-[calc(100vh-73px)] w-full overflow-hidden bg-background">
      <RagManager />
    </div>
  );
}
