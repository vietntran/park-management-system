// src/utils/userSearch.ts
import { handleClientError } from "@/lib/errors/clientErrorHandler";
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
    const response = await fetch(
      `/api/users/search?q=${encodeURIComponent(query)}`,
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to search users");
    }

    const data = await response.json();

    // Filter out already selected users
    const filteredResults = data.filter(
      (user: SearchResult) =>
        !selectedUsers.some((selected) => selected.id === user.id),
    );

    return { results: filteredResults, error: null };
  } catch (error) {
    handleClientError(
      error instanceof Error ? error : new Error("Failed to search users"),
      {
        path: "/api/users/search",
        method: "GET",
      },
    );
    return {
      results: [],
      error: error instanceof Error ? error.message : "Failed to search users",
    };
  }
};
