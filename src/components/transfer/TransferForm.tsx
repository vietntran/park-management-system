import { zodResolver } from "@hookform/resolvers/zod";
import { Search } from "lucide-react";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { handleFormError } from "@/lib/errors/clientErrorHandler";
import type {
  Reservation,
  TransferFormData,
  SelectedUser,
} from "@/types/reservation";

const transferFormSchema = z.object({
  reservationId: z.string().uuid(),
  toUserId: z.string().uuid({
    message: "Please select a recipient",
  }),
  spotsToTransfer: z.array(z.string().uuid()).min(1, {
    message: "Select at least one spot to transfer",
  }),
  isPrimaryTransfer: z.boolean(),
});

interface TransferFormProps {
  reservation: Reservation;
  onSubmit: (data: TransferFormData) => Promise<void>;
  onCancel: () => void;
  searchUsers: (query: string) => Promise<SelectedUser[]>;
}

export const TransferForm = ({
  reservation,
  onSubmit,
  onCancel,
  searchUsers,
}: TransferFormProps) => {
  const [searchResults, setSearchResults] = useState<SelectedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<TransferFormData>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      reservationId: reservation.id,
      toUserId: "",
      spotsToTransfer: [],
      isPrimaryTransfer: false,
    },
  });

  const handleSearch = async (query: string) => {
    if (query.length < 2) return;
    setIsSearching(true);
    try {
      const results = await searchUsers(query);
      setSearchResults(results);
      setError(null);
    } catch (err) {
      setError(handleFormError(err));
    } finally {
      setIsSearching(false);
    }
  };

  const handleFormSubmit = async (data: TransferFormData) => {
    setError(null);
    try {
      await onSubmit(data);
    } catch (err) {
      setError(handleFormError(err));
    }
  };

  const isPrimaryUser =
    reservation.primaryUserId ===
    reservation.reservationUsers.find((ru) => ru.isPrimary)?.userId;

  const transferableSpots = reservation.reservationUsers.filter(
    (ru) => isPrimaryUser || ru.userId === reservation.primaryUserId,
  );

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <h2 className="text-2xl font-bold text-center">Transfer Reservation</h2>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
          <AlertTitle>Transfer Rules</AlertTitle>
          <AlertDescription>
            <ul className="list-disc ml-4 space-y-1">
              <li>
                Transfers must be completed by 5 PM Central the day before the
                reservation
              </li>
              <li>Transfer requests expire after 24 hours</li>
              <li>Only one pending transfer per reservation is allowed</li>
              {isPrimaryUser ? (
                <li>
                  As the primary reservation holder, you can transfer any or all
                  spots
                </li>
              ) : (
                <li>
                  As a non-primary user, you can only transfer your own spot
                </li>
              )}
            </ul>
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="toUserId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transfer To</FormLabel>
                  <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                        >
                          {field.value
                            ? searchResults.find(
                                (user) => user.id === field.value,
                              )?.name
                            : "Search for a user..."}
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput
                          placeholder="Search users..."
                          onValueChange={handleSearch}
                          className="h-9"
                        />
                        {isSearching ? (
                          <CommandEmpty>Searching...</CommandEmpty>
                        ) : (
                          <CommandEmpty>No users found.</CommandEmpty>
                        )}
                        <CommandGroup>
                          {searchResults.map((user) => (
                            <CommandItem
                              key={user.id}
                              value={user.id}
                              onSelect={() => {
                                form.setValue("toUserId", user.id, {
                                  shouldValidate: true,
                                });
                                setSearchOpen(false);
                              }}
                            >
                              <span>{user.name}</span>
                              <span className="ml-2 text-sm text-muted-foreground">
                                {user.email}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="spotsToTransfer"
              render={() => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Select Spots to Transfer</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      {form.watch("spotsToTransfer").length}/
                      {transferableSpots.length} Spots
                    </p>
                  </div>
                  <div className="space-y-2 border rounded-lg p-4">
                    {transferableSpots.map((spot) => (
                      <FormField
                        key={spot.userId}
                        control={form.control}
                        name="spotsToTransfer"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(spot.userId)}
                                onCheckedChange={(checked) => {
                                  const value = field.value || [];
                                  const newValue = checked
                                    ? [...value, spot.userId]
                                    : value.filter((id) => id !== spot.userId);
                                  form.setValue("spotsToTransfer", newValue, {
                                    shouldValidate: true,
                                  });
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              {spot.user?.name} {spot.isPrimary && "(Primary)"}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isPrimaryUser && (
              <FormField
                control={form.control}
                name="isPrimaryTransfer"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1">
                      <FormLabel>Transfer Primary Role</FormLabel>
                      <FormDescription>
                        Transfer primary reservation holder responsibilities
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            )}

            {error && (
              <Alert variant="error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || isSearching}
              >
                {form.formState.isSubmitting
                  ? "Creating Transfer..."
                  : "Create Transfer"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default TransferForm;
