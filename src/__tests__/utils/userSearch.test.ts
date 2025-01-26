// src/__tests__/utils/userSearch.test.ts
import { handleClientError } from "@/lib/errors/clientErrorHandler";

import { searchUsers } from "../../utils/userSearch";

// Mock handleClientError since we don't want to test its implementation
jest.mock("@/lib/errors/clientErrorHandler", () => ({
  handleClientError: jest.fn(),
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("searchUsers", () => {
  // Mock data
  const mockSearchResults = [
    { id: "1", name: "John Doe", email: "john@example.com" },
    { id: "2", name: "Jane Smith", email: "jane@example.com" },
    { id: "3", name: "Bob Johnson", email: "bob@example.com" },
  ];

  const mockSelectedUsers = [
    {
      id: "2",
      name: "Jane Smith",
      email: "jane@example.com",
      canModify: false,
      canTransfer: false,
    },
  ];

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it("returns empty results for queries less than 2 characters", async () => {
    const result = await searchUsers("a", []);
    expect(result).toEqual({ results: [], error: null });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("successfully searches and filters out selected users", async () => {
    // Mock successful API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSearchResults,
    });

    const result = await searchUsers("John", mockSelectedUsers);

    expect(mockFetch).toHaveBeenCalledWith("/api/users/search?q=John");

    // Should filter out Jane Smith who is already selected
    expect(result.results).toEqual([
      mockSearchResults[0],
      mockSearchResults[2],
    ]);
    expect(result.error).toBeNull();
  });

  it("handles API error responses", async () => {
    const errorMessage = "API Error";
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: errorMessage }),
    });

    const result = await searchUsers("test", []);

    expect(mockFetch).toHaveBeenCalledWith("/api/users/search?q=test");
    expect(result.results).toEqual([]);
    expect(result.error).toBe(errorMessage);
    expect(handleClientError).toHaveBeenCalled();
  });

  it("handles network errors", async () => {
    const networkError = new Error("Network error");
    mockFetch.mockRejectedValueOnce(networkError);

    const result = await searchUsers("test", []);

    expect(mockFetch).toHaveBeenCalledWith("/api/users/search?q=test");
    expect(result.results).toEqual([]);
    expect(result.error).toBe("Network error");
    expect(handleClientError).toHaveBeenCalledWith(networkError, {
      path: "/api/users/search",
      method: "GET",
    });
  });

  it("handles empty API response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const result = await searchUsers("nonexistent", []);

    expect(mockFetch).toHaveBeenCalledWith("/api/users/search?q=nonexistent");
    expect(result.results).toEqual([]);
    expect(result.error).toBeNull();
  });

  it("properly encodes query parameters", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    await searchUsers("test query&", []);

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/users/search?q=test%20query%26",
    );
  });
});
