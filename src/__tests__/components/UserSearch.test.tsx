// src/__tests__/components/UserSearch.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";

import { UserSearch } from "@/components/reservation/UserSearch";
import type { SelectedUser } from "@/types/reservation";
import { searchUsers } from "@/utils/userSearch";

// Mock the searchUsers function
jest.mock("@/utils/userSearch", () => ({
  searchUsers: jest.fn(),
}));

const mockSearchUsers = searchUsers as jest.MockedFunction<typeof searchUsers>;

// Mock UI components
jest.mock("@/components/ui/Alert", () => ({
  Alert: jest.fn(({ children, variant }) => (
    <div data-testid="alert" data-variant={variant}>
      {children}
    </div>
  )),
  AlertDescription: jest.fn(({ children }) => <div>{children}</div>),
}));

jest.mock("@/components/ui/button", () => ({
  Button: jest.fn(({ children, onClick, disabled, ...props }) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  )),
}));

jest.mock("@/components/ui/card", () => ({
  Card: jest.fn(({ children, className }) => (
    <div className={className}>{children}</div>
  )),
}));

jest.mock("@/components/ui/input", () => ({
  Input: jest.fn(
    ({ placeholder, value, onChange, onKeyDown, className, disabled }) => (
      <input
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        className={className}
        disabled={disabled}
        data-testid="search-input"
      />
    ),
  ),
}));

// Mock accordion components
jest.mock("@/components/ui/accordion", () => ({
  Accordion: jest.fn(({ children, value, onValueChange }) => (
    <div data-testid="accordion" data-value={value}>
      {children}
      <button
        data-testid="accordion-value-change"
        onClick={() => onValueChange(value ? "" : "users")}
      >
        Toggle
      </button>
    </div>
  )),
  AccordionItem: jest.fn(({ children, value }) => (
    <div data-testid="accordion-item" data-value={value}>
      {children}
    </div>
  )),
  AccordionTrigger: jest.fn(({ children, className }) => (
    <button data-testid="accordion-trigger" className={className}>
      {children}
    </button>
  )),
  AccordionContent: jest.fn(({ children, className }) => (
    <div data-testid="accordion-content" className={className}>
      {children}
    </div>
  )),
}));

describe("UserSearch", () => {
  const mockUser: SelectedUser = {
    id: "user1",
    name: "John Doe",
    email: "john@example.com",
  };

  const mockProps = {
    onUserSelect: jest.fn(),
    selectedUsers: [] as SelectedUser[],
    maxUsers: 3,
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementation for searchUsers
    mockSearchUsers.mockResolvedValue({
      results: [mockUser],
      error: null,
    });
  });

  it("shows search button in default state", () => {
    render(<UserSearch {...mockProps} />);
    expect(screen.getByTestId("accordion-trigger")).toHaveTextContent(
      "Search for users...",
    );
  });

  it("shows loading state when isLoading prop is true", () => {
    render(<UserSearch {...mockProps} isLoading={true} />);
    expect(screen.getByTestId("accordion-trigger")).toHaveTextContent(
      "Validating users...",
    );
  });

  it("shows 'Maximum users reached' when max users are selected", () => {
    const selectedUsers = Array(3)
      .fill(mockUser)
      .map((user, index) => ({
        ...user,
        id: `user${index + 1}`, // Make user IDs unique
      }));
    render(
      <UserSearch {...mockProps} selectedUsers={selectedUsers} maxUsers={3} />,
    );
    expect(screen.getByTestId("accordion-trigger")).toHaveTextContent(
      "Maximum users reached",
    );
  });

  it("searches users when search button is clicked", async () => {
    render(<UserSearch {...mockProps} />);

    // Toggle accordion open
    await act(async () => {
      await userEvent.click(screen.getByTestId("accordion-value-change"));
    });

    // Type in search field
    await act(async () => {
      await userEvent.type(screen.getByTestId("search-input"), "John");
    });

    // Click the search button using a precise name match
    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: /^Search$/i }));
    });

    expect(mockSearchUsers).toHaveBeenCalledWith("John", []);
  });

  it("searches users when Enter key is pressed", async () => {
    render(<UserSearch {...mockProps} />);

    // Toggle accordion open
    await act(async () => {
      await userEvent.click(screen.getByTestId("accordion-value-change"));
    });

    // Type in search field and press Enter
    const searchInput = screen.getByTestId("search-input");
    await act(async () => {
      await userEvent.type(searchInput, "John");
      await userEvent.keyboard("{Enter}");
    });

    expect(mockSearchUsers).toHaveBeenCalledWith("John", []);
  });

  it("does not search when input changes without pressing search button", async () => {
    render(<UserSearch {...mockProps} />);

    // Toggle accordion open
    await act(async () => {
      await userEvent.click(screen.getByTestId("accordion-value-change"));
    });

    // Type in search field without clicking search
    await act(async () => {
      await userEvent.type(screen.getByTestId("search-input"), "John");
    });

    // The search function should not be called
    expect(mockSearchUsers).not.toHaveBeenCalled();
  });

  it("disables search button when input is empty", async () => {
    render(<UserSearch {...mockProps} />);

    // Toggle accordion open
    await act(async () => {
      await userEvent.click(screen.getByTestId("accordion-value-change"));
    });

    const searchButton = screen.getByRole("button", { name: /^Search$/i });
    expect(searchButton).toBeDisabled();
  });

  it("enables search button when input has text", async () => {
    render(<UserSearch {...mockProps} />);

    // Toggle accordion open
    await act(async () => {
      await userEvent.click(screen.getByTestId("accordion-value-change"));
    });

    // Type in search field
    await act(async () => {
      await userEvent.type(screen.getByTestId("search-input"), "John");
    });

    const searchButton = screen.getByRole("button", { name: /^Search$/i });
    expect(searchButton).not.toBeDisabled();
  });

  it("handles failed search gracefully", async () => {
    mockSearchUsers.mockResolvedValue({
      results: [],
      error: "Search failed",
    });

    render(<UserSearch {...mockProps} />);

    // Toggle accordion open
    await act(async () => {
      await userEvent.click(screen.getByTestId("accordion-value-change"));
    });

    // Type and search
    await act(async () => {
      await userEvent.type(screen.getByTestId("search-input"), "John");
      await userEvent.click(screen.getByRole("button", { name: /^Search$/i }));
    });

    await waitFor(() => {
      expect(screen.getByText("Search failed")).toBeInTheDocument();
    });
  });

  it("calls onUserSelect with user when user is selected", async () => {
    render(<UserSearch {...mockProps} />);

    // Toggle accordion open
    await act(async () => {
      await userEvent.click(screen.getByTestId("accordion-value-change"));
    });

    // Type and search
    await act(async () => {
      await userEvent.type(screen.getByTestId("search-input"), "John");
      await userEvent.click(screen.getByRole("button", { name: /^Search$/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(mockUser.name)).toBeInTheDocument();
    });

    await act(async () => {
      // Select the user by clicking the Add button
      await userEvent.click(screen.getByText("Add"));
    });

    expect(mockProps.onUserSelect).toHaveBeenCalledWith([mockUser]);
  });

  it("allows removing selected users", async () => {
    render(<UserSearch {...mockProps} selectedUsers={[mockUser]} />);

    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    });

    expect(mockProps.onUserSelect).toHaveBeenCalledWith([]);
  });

  it("handles search errors", async () => {
    mockSearchUsers.mockResolvedValue({
      results: [],
      error: "Network error",
    });

    render(<UserSearch {...mockProps} />);

    // Toggle accordion open
    await act(async () => {
      await userEvent.click(screen.getByTestId("accordion-value-change"));
    });

    // Type and search
    await act(async () => {
      await userEvent.type(screen.getByTestId("search-input"), "John");
      await userEvent.click(screen.getByRole("button", { name: /^Search$/i }));
    });

    await waitFor(() => {
      expect(screen.getByTestId("alert")).toHaveAttribute(
        "data-variant",
        "error",
      );
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("clears search input after selecting a user", async () => {
    render(
      <UserSearch
        selectedUsers={[]}
        onUserSelect={mockProps.onUserSelect}
        maxUsers={4}
        isLoading={false}
      />,
    );

    // Toggle accordion open
    await act(async () => {
      await userEvent.click(screen.getByTestId("accordion-value-change"));
    });

    // Type in search
    const searchInput = screen.getByTestId("search-input");
    await act(async () => {
      await userEvent.type(searchInput, "John");
      await userEvent.click(screen.getByRole("button", { name: /^Search$/i }));
    });

    // Wait for and select user
    await waitFor(() => {
      expect(screen.getByText(mockUser.name)).toBeInTheDocument();
      expect(screen.getByText(mockUser.email)).toBeInTheDocument();
    });

    // Select the user by clicking the Add button
    await act(async () => {
      await userEvent.click(screen.getByText("Add"));
    });

    // Verify search input is cleared
    expect(searchInput).toHaveValue("");
  });

  it("disables search when isLoading is true", () => {
    render(<UserSearch {...mockProps} isLoading={true} />);

    // Toggle accordion open
    act(() => {
      userEvent.click(screen.getByTestId("accordion-value-change"));
    });

    const searchInput = screen.getByTestId("search-input");
    const searchButton = screen.getByRole("button", { name: /^Search$/i });

    expect(searchInput).toBeDisabled();
    expect(searchButton).toBeDisabled();
  });

  it("disables search when max users are selected", () => {
    const selectedUsers = Array(3)
      .fill(mockUser)
      .map((user, index) => ({
        ...user,
        id: `user${index + 1}`, // Make user IDs unique
      }));

    render(
      <UserSearch {...mockProps} selectedUsers={selectedUsers} maxUsers={3} />,
    );

    // Toggle accordion open
    act(() => {
      userEvent.click(screen.getByTestId("accordion-value-change"));
    });

    const searchInput = screen.getByTestId("search-input");
    const searchButton = screen.getByRole("button", { name: /search/i });

    expect(searchInput).toBeDisabled();
    expect(searchButton).toBeDisabled();
  });

  it("shows empty results message when no users are found", async () => {
    mockSearchUsers.mockResolvedValue({
      results: [],
      error: null,
    });

    render(<UserSearch {...mockProps} />);

    // Toggle accordion open
    await act(async () => {
      await userEvent.click(screen.getByTestId("accordion-value-change"));
    });

    // Type and search
    await act(async () => {
      await userEvent.type(screen.getByTestId("search-input"), "NonExistent");
      await userEvent.click(screen.getByRole("button", { name: /^Search$/i }));
    });

    await waitFor(() => {
      expect(screen.getByText("No users found")).toBeInTheDocument();
    });
  });

  it("shows guidance message when no search has been performed", async () => {
    render(<UserSearch {...mockProps} />);

    // Toggle accordion open
    await act(async () => {
      await userEvent.click(screen.getByTestId("accordion-value-change"));
    });

    // Check for guidance message
    expect(
      screen.getByText("Enter a search term and click Search"),
    ).toBeInTheDocument();
  });
});
