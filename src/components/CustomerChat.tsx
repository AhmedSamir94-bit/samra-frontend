import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ChatConversation, ChatMessage } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  connectStaffChat,
  disconnectStaffChat,
  joinOrderRoom,
  setChatViewing,
  getStaffSocket,
} from "@/lib/staff-chat";

export default function CustomerChat() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");

  const { data: conversations = [] } = useQuery({
    queryKey: ["chat-conversations"],
    queryFn: () => api.getChatConversations(),
    refetchInterval: 20000,
  });

  useEffect(() => {
    connectStaffChat();
    const socket = getStaffSocket();
    if (!socket) return;

    const onMessage = (msg: ChatMessage) => {
      if (selectedId && msg.orderId === selectedId) {
        setMessages((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
        );
      }
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    };

    socket.on("message:new", onMessage);
    return () => {
      socket.off("message:new", onMessage);
      disconnectStaffChat();
    };
  }, [selectedId, queryClient]);

  useEffect(() => {
    if (!selectedId) return;
    joinOrderRoom(selectedId);
    setChatViewing(selectedId, true);
    api.getChatMessages(selectedId).then((res) => setMessages(res.messages));
    return () => setChatViewing(selectedId, false);
  }, [selectedId]);

  const sendMutation = useMutation({
    mutationFn: (payload: { orderId: string; text: string }) =>
      api.sendChatMessage(payload.orderId, payload.text),
    onSuccess: (msg) => {
      setText("");
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
      );
    },
  });

  const selected = conversations.find(
    (c: ChatConversation) => c.orderId === selectedId,
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">المحادثات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {conversations.length === 0 && (
            <p className="text-sm app-muted">لا توجد محادثات</p>
          )}
          {conversations.map((c: ChatConversation) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.orderId)}
              className={`w-full text-left rounded-lg border p-3 text-sm transition ${
                selectedId === c.orderId
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                  : "border-gray-200 dark:border-slate-700"
              }`}
            >
              <div className="flex justify-between gap-2">
                <strong>{c.orderNumber}</strong>
                {c.unreadForStaff > 0 && (
                  <Badge variant="destructive">{c.unreadForStaff}</Badge>
                )}
              </div>
              <p className="app-muted truncate">{c.customerName}</p>
              <p className="truncate">{c.lastMessage}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {selected
              ? `${selected.orderNumber} — ${selected.customerName}`
              : "اختر محادثة"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedId ? (
            <p className="app-muted text-sm">اختر طلباً من القائمة</p>
          ) : (
            <>
              <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={
                      m.senderRole === "guest"
                        ? "text-right bg-gray-100 dark:bg-slate-800 rounded-lg p-2"
                        : "text-right bg-blue-100 dark:bg-blue-950/40 rounded-lg p-2"
                    }
                  >
                    {m.text}
                  </div>
                ))}
              </div>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimmed = text.trim();
                  if (!trimmed || !selectedId) return;
                  sendMutation.mutate({ orderId: selectedId, text: trimmed });
                }}
              >
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="اكتب رسالة..."
                />
                <Button type="submit" disabled={sendMutation.isPending}>
                  إرسال
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
