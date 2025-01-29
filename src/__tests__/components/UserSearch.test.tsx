import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";

import { UserSearch } from "@/components/reservation/UserSearch";
import type { SelectedUser } from "@/types/reservation";

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
  Button: jest.fn(({ children, ...props }) => (
    <button {...props}>{children}</button>
  )),
}));

jest.mock("@/components/ui/card", () => ({
  Card: jest.fn(({ children, className }) => (
    <div className={className}>{children}</div>
  )),
}));

jest.mock("@/components/ui/command", () => ({
  Command: jest.fn(({ children }) => (
    <div data-testid="command">{children}</div>
  )),
  CommandInput: jest.fn(({ placeholder, value, onValueChange }) => (
    <input
      placeholder={placeholder}
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
    />
  )),
  CommandEmpty: jest.fn(({ children }) => <div>{children}</div>),
  CommandGroup: jest.fn(({ children }) => <div>{children}</div>),
  CommandItem: jest.fn(({ children, onSelect }) => (
    <div onClick={onSelect}>{children}</div>
  )),
  CommandLoading: jest.fn(({ children }) => <div>{children}</div>),
}));

jest.mock("@/components/ui/popover", () => ({
  Popover: jest.fn(({ children }) => <div>{children}</div>),
  PopoverTrigger: jest.fn(({ children }) => <div>{children}</div>),
  PopoverContent: jest.fn(({ children }) => <div>{children}</div>),
}));

jest.mock("@/components/ui/switch", () => ({
  Switch: jest.fn(({ id, checked, onCheckedChange }) => (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  )),
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

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
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([mockUser]),
    });
  });

  it("shows search button in default state", () => {
    render(<UserSearch {...mockProps} />);
    expect(screen.getByRole("combobox")).toHaveTextContent(
      "Search for users...",
    );
  });

  it("shows loading state when isLoading prop is true", () => {
    render(<UserSearch {...mockProps} isLoading={true} />);
    expect(screen.getByRole("combobox")).toHaveTextContent(
      "Validating users...",
    );
  });

  it("shows 'Maximum users reached' when max users are selected", () => {
    const selectedUsers = Array(3).fill(mockUser);
    render(
      <UserSearch {...mockProps} selectedUsers={selectedUsers} maxUsers={3} />,
    );
    expect(screen.getByRole("combobox")).toHaveTextContent(
      "Maximum users reached",
    );
  });

  it("searches users when query is entered", async () => {
    render(<UserSearch {...mockProps} />);

    await act(async () => {
      await userEvent.click(screen.getByRole("combobox"));
      await userEvent.type(
        screen.getByPlaceholderText("Search by name or email..."),
        "John",
      );
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/users/search?q=John"),
    );
  });

  it("handles failed search gracefully", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Search failed" }),
    });

    render(<UserSearch {...mockProps} />);

    await act(async () => {
      await userEvent.click(screen.getByRole("combobox"));
      await userEvent.type(
        screen.getByPlaceholderText("Search by name or email..."),
        "John",
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Search failed")).toBeInTheDocument();
    });
  });

  it("calls onUserSelect with user when user is selected", async () => {
    render(<UserSearch {...mockProps} />);

    await act(async () => {
      await userEvent.click(screen.getByRole("combobox"));
      await userEvent.type(
        screen.getByPlaceholderText("Search by name or email..."),
        "John",
      );
    });

    await waitFor(() => {
      expect(screen.getByText(mockUser.name)).toBeInTheDocument();
    });

    await act(async () => {
      // Select the user
      await userEvent.click(screen.getByText(mockUser.name));
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

  it("handles search errors from the server", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    render(<UserSearch {...mockProps} />);

    await act(async () => {
      await userEvent.click(screen.getByRole("combobox"));
      await userEvent.type(
        screen.getByPlaceholderText("Search by name or email..."),
        "John",
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("alert")).toHaveAttribute(
        "data-variant",
        "error",
      );
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
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

    // Open the combobox
    await act(async () => {
      await userEvent.click(screen.getByRole("combobox"));
    });

    // Type in search
    const searchInput = screen.getByPlaceholderText(
      "Search by name or email...",
    );
    await act(async () => {
      await userEvent.type(searchInput, "John");
    });

    // Wait for and select user
    await waitFor(() => {
      expect(screen.getByText(mockUser.name)).toBeInTheDocument();
      expect(screen.getByText(mockUser.email)).toBeInTheDocument();
    });

    // Select the user
    await act(async () => {
      await userEvent.click(screen.getByText(mockUser.name));
    });

    // Verify search input is cleared
    expect(searchInput).toHaveValue("");
  });

  it("disables search when isLoading is true", async () => {
    render(<UserSearch {...mockProps} isLoading={true} />);

    const searchButton = screen.getByRole("combobox");
    expect(searchButton).toBeDisabled();
  });
});
