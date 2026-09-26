"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";

export function useReportChat(reportId: string) {
  const queryClient = useQueryClient();
  const queryKey = ["report-chat", reportId];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!reportId) return [];
      const res = await api.getReportChat(reportId);
      return res.messages ?? [];
    },
    enabled: !!reportId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const res = await api.sendReportChatMessage(reportId, messageText);
      return res;
    },
    onMutate: async (messageText: string) => {
      await queryClient.cancelQueries({ queryKey });

      const previousMessages = queryClient.getQueryData<ChatMessage[]>(queryKey) || [];

      const optimisticUserMsg: ChatMessage = {
        id: "temp-" + Date.now(),
        report_id: reportId,
        role: "user",
        content: messageText,
        timestamp: new Date().toISOString(),
      };

      queryClient.setQueryData<ChatMessage[]>(queryKey, [
        ...previousMessages,
        optimisticUserMsg,
      ]);

      return { previousMessages };
    },
    onError: (_err, _messageText, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(queryKey, context.previousMessages);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    messages: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    sendMessage: sendMessageMutation.mutateAsync,
    isSending: sendMessageMutation.isPending,
  };
}
