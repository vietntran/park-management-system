import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../../components/ui/DropdownMenu/DropdownMenu";

describe("DropdownMenu", () => {
  it("renders dropdown menu with full interaction flow", async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();

    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onSelect}>Item 1</DropdownMenuItem>
          <DropdownMenuItem>Item 2</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    // Initial state - menu should be closed
    const trigger = screen.getByRole("button", { name: "Open Menu" });
    expect(trigger).toBeInTheDocument();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    // Open menu
    await act(async () => {
      await user.click(trigger);
    });

    // Verify menu content
    const menu = screen.getByRole("menu");
    expect(menu).toBeVisible();
    const menuItems = screen.getAllByRole("menuitem");
    expect(menuItems).toHaveLength(2);

    // Test item selection
    await act(async () => {
      await user.click(menuItems[0]);
    });

    expect(onSelect).toHaveBeenCalled();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("handles disabled state on menu items", async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();

    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem disabled onSelect={onSelect}>
            Disabled Item
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    // Open menu
    await act(async () => {
      await user.click(screen.getByRole("button"));
    });

    // Try to click disabled item
    await act(async () => {
      await user.click(screen.getByRole("menuitem"));
    });

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole("menuitem")).toHaveAttribute("data-disabled");

    // Add keyboard interaction test here
    await act(async () => {
      await user.tab(); // Focus the disabled item
      await user.keyboard("{Enter}"); // Try to select with Enter
    });
    expect(onSelect).not.toHaveBeenCalled(); // Should still not be called
  });

  it("supports keyboard navigation", async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();

    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onSelect}>Item 1</DropdownMenuItem>
          <DropdownMenuItem>Item 2</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    // Focus and open with keyboard
    await user.tab();
    await act(async () => {
      await user.keyboard("{Enter}");
    });

    // Navigate with arrow keys
    await act(async () => {
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{Enter}");
    });

    // Menu should close after selection
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes menu appropriately", async () => {
    const user = userEvent.setup();

    render(
      <div>
        <div
          data-testid="outside"
          style={{ pointerEvents: "auto" }} // Force pointer events
        >
          Outside
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>,
    );

    // Open menu
    const trigger = screen.getByRole("button", { name: "Open Menu" });
    await act(async () => {
      await user.click(trigger);
    });
    expect(screen.getByRole("menu")).toBeVisible();

    // Close with Escape
    await act(async () => {
      await user.keyboard("{Escape}");
    });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    // // Reopen menu
    await act(async () => {
      await user.click(trigger);
    });
    expect(screen.getByRole("menu")).toBeVisible();

    // Test clicking outside
    const outside = screen.getByTestId("outside");
    await act(async () => {
      // Use pointer events to more accurately simulate clicking outside
      await user.pointer({
        target: outside,
        keys: "[MouseLeft]",
        coords: { x: 0, y: 0 },
      });
    });

    // Add a small delay to allow the click-outside handler to process
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
