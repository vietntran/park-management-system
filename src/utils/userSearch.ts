// src/utils/userSearch.ts
import { typedFetch } from "@/lib/utils";
import type { SelectedUser } from "@/types/reservation";

interface SearchResult {
  id: string;
  name: string;
  email: string;
}

export const searchUsers = async (
  query: string,
  selectedUsers: SelectedUser[],
): Promise<{ results: SearchResult[]; error: string | null }> => {
  if (query.length < 2) {
    return { results: [], error: null };
  }

  try {
    const response = await typedFetch<SearchResult[]>(
      `/api/users/search?q=${encodeURIComponent(query)}`,
    );

    if (!response.success) {
      throw new Error(response.error);
    }

    // Filter out already selected users
    const filteredResults = response.data.filter(
      (user) => !selectedUsers.some((selected) => selected.id === user.id),
    );

    return { results: filteredResults, error: null };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to search users";

    return {
      results: [],
      error: errorMessage,
    };
  }
};
