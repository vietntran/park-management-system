import { Search } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandLoading,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import type { SelectedUser } from "@/types/reservation";

interface SearchResult {
  id: string;
  name: string;
  email: string;
}

interface UserSearchProps {
  onUserSelect: (user: SelectedUser) => void;
  selectedUsers: SelectedUser[];
  maxUsers?: number;
}

export const UserSearch = ({
  onUserSelect,
  selectedUsers,
  maxUsers = 3,
}: UserSearchProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState({
    canModify: false,
    canTransfer: false,
  });

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/users/search?q=${encodeURIComponent(query)}`,
      );
      if (!response.ok) {
        throw new Error("Failed to search users");
      }

      const data = await response.json();

      // Filter out already selected users
      const filteredResults = data.filter(
        (user: SearchResult) =>
          !selectedUsers.some((selected) => selected.id === user.id),
      );

      setSearchResults(filteredResults);
    } catch (error) {
      console.error("Error searching users:", error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (user: SearchResult) => {
    if (selectedUsers.length >= maxUsers) {
      return;
    }

    onUserSelect({
      ...user,
      canModify: permissions.canModify,
      canTransfer: permissions.canTransfer,
    });

    setOpen(false);
    setSearch("");
    setPermissions({ canModify: false, canTransfer: false });
  };

  const handleRemoveUser = (userId: string) => {
    const updatedUsers = selectedUsers.filter((user) => user.id !== userId);
    // Pass the last user in the updated list, or undefined if empty
    onUserSelect(updatedUsers[updatedUsers.length - 1]);
  };

  return (
    <div className="w-full space-y-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={selectedUsers.length >= maxUsers}
          >
            <Search className="mr-2 h-4 w-4" />
            {selectedUsers.length >= maxUsers
              ? "Maximum users reached"
              : "Search for users..."}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0">
          <Command>
            <CommandInput
              placeholder="Search by name or email..."
              value={search}
              onValueChange={(value) => {
                setSearch(value);
                searchUsers(value);
              }}
            />
            {loading && <CommandLoading>Searching...</CommandLoading>}
            {!loading && searchResults.length === 0 && (
              <CommandEmpty>No users found</CommandEmpty>
            )}
            <CommandGroup>
              {searchResults.map((user) => (
                <CommandItem
                  key={user.id}
                  onSelect={() => handleSelect(user)}
                  className="flex justify-between"
                >
                  <div>
                    <p>{user.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
          <div className="p-4 border-t">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="canModify">Can modify reservation</label>
                <Switch
                  id="canModify"
                  checked={permissions.canModify}
                  onCheckedChange={(checked) =>
                    setPermissions((prev) => ({ ...prev, canModify: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <label htmlFor="canTransfer">Can transfer reservation</label>
                <Switch
                  id="canTransfer"
                  checked={permissions.canTransfer}
                  onCheckedChange={(checked) =>
                    setPermissions((prev) => ({
                      ...prev,
                      canTransfer: checked,
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected Users List */}
      <div className="space-y-2">
        {selectedUsers.map((user) => (
          <Card key={user.id} className="p-4 flex justify-between items-center">
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="text-xs text-muted-foreground mt-1">
                {user.canModify && "Can modify • "}
                {user.canTransfer && "Can transfer"}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveUser(user.id)}
            >
              Remove
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};
