"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { HealthProfile } from "@/lib/types";

export function useHealthProfile() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["health-profile"],
    queryFn: () => api.profile(),
  });

  const updateMutation = useMutation({
    mutationFn: (updated: Partial<HealthProfile>) => api.updateProfile(updated),
    onSuccess: (newData) => {
      queryClient.setQueryData(["health-profile"], newData);
    },
  });

  return {
    profile: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    updateProfile: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
