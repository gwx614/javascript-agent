"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RagStatus {
  status: string;
  stats: {
    documentCount?: number;
    error?: string;
  };
}

interface Document {
  id: string;
  content: string;
  metadata: {
    title?: string;
    path?: string;
    category?: string;
  };
  distance: number;
}

interface RagResponse {
  status: string;
  message: string;
}

const PAGE_SIZE = 20;

export function RagManager() {
  const [status, setStatus] = useState<RagStatus | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingResult, setIndexingResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/rag");
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError("获取RAG状态失败");
      console.error("获取RAG状态失败:", err);
    }
  };

  const fetchDocuments = useCallback(async (page: number = 1) => {
    try {
      setIsLoadingDocs(true);
      const offset = (page - 1) * PAGE_SIZE;
      const response = await fetch(`/api/rag?action=list&limit=${PAGE_SIZE}&offset=${offset}`);
      const data = await response.json();
      if (data.status === "ok") {
        setDocuments(data.documents);
        setTotal(data.total);
        setCurrentPage(page);
      }
    } catch (err) {
      console.error("获取文档列表失败:", err);
    } finally {
      setIsLoadingDocs(false);
    }
  }, []);

  const goToPage = (page: number) => {
    fetchDocuments(page);
  };

  const indexDocuments = async () => {
    try {
      setIsIndexing(true);
      setIndexingResult(null);
      setError(null);

      const response = await fetch("/api/rag", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "index" }),
      });

      const data: RagResponse = await response.json();

      if (data.status === "success") {
        setIndexingResult(data.message);
        await fetchStatus();
        fetchDocuments(1);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("索引文档失败");
      console.error("索引文档失败:", err);
    } finally {
      setIsIndexing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchDocuments(1);
  }, [fetchDocuments]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const startItem = (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, total);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showPages = 5;

    if (totalPages <= showPages + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-bold">RAG 状态</h2>

        <div className="mb-6 space-y-3">
          {status ? (
            <>
              <div className="flex items-center gap-2">
                <span className="w-24 text-gray-600">状态:</span>
                <Badge variant={status.status === "ok" ? "default" : "destructive"}>
                  {status.status === "ok" ? "正常" : "错误"}
                </Badge>
              </div>
              {status.stats.documentCount !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="w-24 text-gray-600">文档数量:</span>
                  <span className="font-medium">{status.stats.documentCount}</span>
                </div>
              )}
              {status.stats.error && <div className="text-red-500">{status.stats.error}</div>}
            </>
          ) : (
            <div className="text-gray-500">加载中...</div>
          )}
        </div>

        <div className="mb-6">
          <h3 className="mb-2 font-semibold">文档索引</h3>
          <p className="mb-3 text-sm text-gray-500">点击按钮索引知识文档到向量数据库</p>
          <Button onClick={indexDocuments} disabled={isIndexing} className="w-full">
            {isIndexing ? "索引中..." : "开始索引文档"}
          </Button>
        </div>

        {indexingResult && (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {indexingResult}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">文档列表</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDocuments(currentPage)}
            disabled={isLoadingDocs}
          >
            {isLoadingDocs ? "加载中..." : "刷新"}
          </Button>
        </div>

        <div className="mb-3 text-sm text-gray-500">
          显示 {startItem}-{endItem} / {total} 个文档
        </div>

        <ScrollArea className="h-[350px]">
          {documents.length === 0 ? (
            <div className="text-gray-500">暂无文档</div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc, index) => (
                <div
                  key={doc.id}
                  className="cursor-pointer rounded-md border p-3 transition-colors hover:bg-gray-50"
                  onClick={() => setSelectedDoc(doc)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">
                        {startItem + index}. {doc.metadata?.title || "未知"}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {doc.metadata?.path || "未知路径"}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {doc.content.length} 字符
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1 || isLoadingDocs}
            >
              上一页
            </Button>

            {getPageNumbers().map((page, index) =>
              typeof page === "number" ? (
                <Button
                  key={index}
                  variant={page === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => goToPage(page)}
                  disabled={isLoadingDocs}
                >
                  {page}
                </Button>
              ) : (
                <span key={index} className="px-2">
                  {page}
                </span>
              )
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages || isLoadingDocs}
            >
              下一页
            </Button>
          </div>
        )}
      </Card>

      {selectedDoc && (
        <Card className="col-span-full p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">{selectedDoc.metadata?.title || "未知"}</h2>
            <Button variant="outline" size="sm" onClick={() => setSelectedDoc(null)}>
              关闭
            </Button>
          </div>
          <div className="mb-2 text-sm text-gray-500">
            路径: {selectedDoc.metadata?.path || "未知"}
          </div>
          <div className="mb-2 text-sm text-gray-500">ID: {selectedDoc.id}</div>
          <ScrollArea className="h-[300px] rounded-md border bg-gray-50 p-4">
            <pre className="whitespace-pre-wrap text-sm">{selectedDoc.content}</pre>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}
