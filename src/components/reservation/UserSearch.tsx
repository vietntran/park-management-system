import { Search } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/Alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

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
    setSearch("");
    setSearchResults([]);
    setSearchError(null);
  };

  const handleRemoveUser = (userId: string) => {
    const updatedUsers = selectedUsers.filter((user) => user.id !== userId);
    onUserSelect(updatedUsers);
  };

  return (
    <ComponentErrorBoundary componentName="UserSearch">
      <div className="w-full space-y-4">
        <Accordion
          type="single"
          collapsible
          value={isOpen ? "users" : ""}
          onValueChange={(value) => setIsOpen(value === "users")}
        >
          <AccordionItem value="users" className="border rounded-md">
            <AccordionTrigger className="px-4 py-2 hover:no-underline">
              <div className="flex items-center">
                <Search className="mr-2 h-4 w-4" />
                <span>
                  {isLoading
                    ? "Validating users..."
                    : selectedUsers.length >= maxUsers
                      ? "Maximum users reached"
                      : "Search for users..."}
                </span>
              </div>
              <div className="text-sm text-muted-foreground ml-2">
                {selectedUsers.length}/{maxUsers} Additional Users
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-4">
                {/* Search Input */}
                <div className="relative">
                  <Input
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      handleSearch(e.target.value);
                    }}
                    className="w-full pr-10"
                    disabled={selectedUsers.length >= maxUsers || isLoading}
                  />
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>

                {/* Loading State */}
                {isSearching && (
                  <div className="text-center py-2 text-sm text-muted-foreground">
                    Searching...
                  </div>
                )}

                {/* Error Message */}
                {searchError && (
                  <Alert variant="error">
                    <AlertDescription>{searchError}</AlertDescription>
                  </Alert>
                )}

                {/* Search Results */}
                {!isSearching && searchResults.length > 0 && (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="flex justify-between items-center p-2 hover:bg-accent rounded-md cursor-pointer"
                        onClick={() => handleSelect(user)}
                      >
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(user);
                          }}
                          disabled={selectedUsers.length >= maxUsers}
                        >
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* No Results */}
                {!isSearching &&
                  search.trim() !== "" &&
                  searchResults.length === 0 &&
                  !searchError && (
                    <div className="text-center py-2 text-sm text-muted-foreground">
                      No users found
                    </div>
                  )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

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
