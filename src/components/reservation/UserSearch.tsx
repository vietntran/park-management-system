import { Search } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/Alert";
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
import type { SelectedUser } from "@/types/reservation";
import { searchUsers } from "@/utils/userSearch";

import { ComponentErrorBoundary } from "../error/ComponentErrorBoundary";

interface SearchResult {
  id: string;
  name: string;
  email: string;
}

export interface UserSearchProps {
  onUserSelect: (user: SelectedUser[]) => void;
  selectedUsers: SelectedUser[];
  maxUsers?: number;
  isLoading?: boolean;
}

export const UserSearch = ({
  onUserSelect,
  selectedUsers,
  maxUsers = 3,
  isLoading = false,
}: UserSearchProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    const { results, error } = await searchUsers(query, selectedUsers);
    setSearchResults(results);
    setSearchError(error);
    setIsSearching(false);
  };

  const handleSelect = (user: SearchResult) => {
    if (selectedUsers.length >= maxUsers) {
      return;
    }

    onUserSelect([...selectedUsers, user]);
    setOpen(false);
    setSearch("");
    setSearchError(null);
  };

  const handleRemoveUser = (userId: string) => {
    const updatedUsers = selectedUsers.filter((user) => user.id !== userId);
    onUserSelect(updatedUsers);
  };

  return (
    <ComponentErrorBoundary componentName="UserSearch">
      <div className="w-full space-y-4">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
              disabled={selectedUsers.length >= maxUsers || isLoading}
            >
              <Search className="mr-2 h-4 w-4" />
              {isLoading
                ? "Validating users..."
                : selectedUsers.length >= maxUsers
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
                  handleSearch(value);
                }}
              />
              {isSearching && <CommandLoading>Searching...</CommandLoading>}
              {!isSearching && searchResults.length === 0 && !searchError && (
                <CommandEmpty>No users found</CommandEmpty>
              )}
              {searchError && (
                <div className="p-2">
                  <Alert variant="error">
                    <AlertDescription>{searchError}</AlertDescription>
                  </Alert>
                </div>
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
          </PopoverContent>
        </Popover>

        {/* Selected Users List */}
        <div className="space-y-2">
          {selectedUsers.map((user) => (
            <Card
              key={user.id}
              className="p-4 flex justify-between items-center"
            >
              <div>
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveUser(user.id)}
                disabled={isLoading}
              >
                Remove
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </ComponentErrorBoundary>
  );
};
