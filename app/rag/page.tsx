import { RagManager } from "@/components/rag/RagManager";

export default function RagPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">RAG 系统管理</h1>
      <RagManager />
    </div>
  );
}
