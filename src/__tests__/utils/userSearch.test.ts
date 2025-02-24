// src/__tests__/utils/userSearch.test.ts
import { typedFetch } from "@/lib/utils";
import type { SelectedUser } from "@/types/reservation";

import { searchUsers } from "../../utils/userSearch";

// Mock typedFetch
jest.mock("@/lib/utils", () => ({
  typedFetch: jest.fn(),
}));

const mockTypedFetch = typedFetch as jest.MockedFunction<typeof typedFetch>;

describe("searchUsers", () => {
  // Mock data
  const mockSearchResults = [
    { id: "1", name: "John Doe", email: "john@example.com" },
    { id: "2", name: "Jane Smith", email: "jane@example.com" },
    { id: "3", name: "Bob Johnson", email: "bob@example.com" },
  ];

  const mockSelectedUsers: SelectedUser[] = [
    {
      id: "2",
      name: "Jane Smith",
      email: "jane@example.com",
    },
  ];

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it("returns empty results for queries less than 2 characters", async () => {
    const result = await searchUsers("a", []);
    expect(result).toEqual({ results: [], error: null });
    expect(mockTypedFetch).not.toHaveBeenCalled();
  });

  it("successfully searches and filters out selected users", async () => {
    // Mock successful API response
    mockTypedFetch.mockResolvedValueOnce({
      success: true,
      data: mockSearchResults,
    });

    const result = await searchUsers("John", mockSelectedUsers);

    expect(mockTypedFetch).toHaveBeenCalledWith(
      `/api/users/search?q=${encodeURIComponent("John")}`,
    );

    // Should filter out Jane Smith who is already selected
    expect(result.results).toEqual([
      mockSearchResults[0],
      mockSearchResults[2],
    ]);
    expect(result.error).toBeNull();
  });

  it("handles API error responses", async () => {
    const errorMessage = "API Error";
    mockTypedFetch.mockRejectedValueOnce(new Error(errorMessage));

    const result = await searchUsers("test", []);

    expect(mockTypedFetch).toHaveBeenCalledWith(
      `/api/users/search?q=${encodeURIComponent("test")}`,
    );
    expect(result.results).toEqual([]);
    expect(result.error).toBe(errorMessage);
  });

  it("handles empty API response", async () => {
    mockTypedFetch.mockResolvedValueOnce({
      success: true,
      data: [],
    });

    const result = await searchUsers("nonexistent", []);

    expect(mockTypedFetch).toHaveBeenCalledWith(
      `/api/users/search?q=${encodeURIComponent("nonexistent")}`,
    );
    expect(result.results).toEqual([]);
    expect(result.error).toBeNull();
  });

  it("properly encodes query parameters", async () => {
    mockTypedFetch.mockResolvedValueOnce({
      success: true,
      data: [],
    });

    await searchUsers("test query&", []);

    expect(mockTypedFetch).toHaveBeenCalledWith(
      `/api/users/search?q=${encodeURIComponent("test query&")}`,
    );
  });

  it("handles non-success response from API", async () => {
    const errorMessage = "User not found";
    mockTypedFetch.mockResolvedValueOnce({
      success: false,
      error: errorMessage,
    });

    const result = await searchUsers("test", []);

    expect(mockTypedFetch).toHaveBeenCalledWith(
      `/api/users/search?q=${encodeURIComponent("test")}`,
    );
    expect(result.results).toEqual([]);
    expect(result.error).toBe(errorMessage);
  });
});
