import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { UserSearch } from "@/components/reservation/UserSearch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { handleFormError } from "@/lib/errors/clientErrorHandler";
import { transferNotifications } from "@/lib/notifications";
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
}

export const TransferForm = ({
  reservation,
  onSubmit,
  onCancel,
}: TransferFormProps) => {
  const [isValidatingUsers, setIsValidatingUsers] = useState(false);
  const [selectedUserName, setSelectedUserName] = useState<string>("");

  const form = useForm<TransferFormData>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      reservationId: reservation.id,
      toUserId: "",
      spotsToTransfer: [],
      isPrimaryTransfer: false,
    },
  });

  const isPrimaryUser =
    reservation.primaryUserId ===
    reservation.reservationUsers.find((ru) => ru.isPrimary)?.userId;

  const transferableSpots = reservation.reservationUsers.filter(
    (ru) => isPrimaryUser || ru.userId === reservation.primaryUserId,
  );

  const handleUserSelect = async (users: SelectedUser[]) => {
    setIsValidatingUsers(true);
    try {
      const selectedUser = users[0];
      if (selectedUser) {
        form.setValue("toUserId", selectedUser.id, {
          shouldValidate: true,
        });
        setSelectedUserName(selectedUser.name);
      }
    } catch (err) {
      const errorMessage = handleFormError(err);
      transferNotifications.validationError(errorMessage);
      form.setError("toUserId", { message: errorMessage });
    } finally {
      setIsValidatingUsers(false);
    }
  };

  const handleFormSubmit = async (data: TransferFormData) => {
    try {
      await onSubmit(data);
      transferNotifications.created();
    } catch (err) {
      const errorMessage = handleFormError(err);
      transferNotifications.creationError(errorMessage);
      form.setError("root", { message: errorMessage });
    }
  };

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
                  <UserSearch
                    onUserSelect={handleUserSelect}
                    selectedUsers={
                      field.value
                        ? [
                            {
                              id: field.value,
                              name: selectedUserName,
                              email: "",
                            },
                          ]
                        : []
                    }
                    maxUsers={1}
                    isLoading={isValidatingUsers}
                  />
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
                        render={({ field }) => {
                          const isChecked = field.value?.includes(spot.userId);

                          const toggleCheckbox = (checked: boolean) => {
                            const value = field.value || [];
                            const newValue = checked
                              ? [...value, spot.userId]
                              : value.filter((id) => id !== spot.userId);

                            // Set value with validation
                            form.setValue("spotsToTransfer", newValue, {
                              shouldValidate: true,
                              shouldDirty: true,
                              shouldTouch: true,
                            });

                            // Trigger validation
                            form.trigger("spotsToTransfer");
                          };

                          return (
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={toggleCheckbox}
                                  id={`spot-${spot.userId}`}
                                />
                              </FormControl>
                              <FormLabel
                                className="text-sm font-normal cursor-pointer"
                                htmlFor={`spot-${spot.userId}`}
                              >
                                {spot.user?.name}{" "}
                                {spot.isPrimary && "(Primary)"}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
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
                        id="primary-transfer"
                      />
                    </FormControl>
                    <div className="space-y-1">
                      <FormLabel
                        className="cursor-pointer"
                        htmlFor="primary-transfer"
                      >
                        Transfer Primary Role
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Transfer primary reservation holder responsibilities
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            )}

            {form.formState.errors.root && (
              <Alert variant="error" role="alert">
                <AlertDescription>
                  {form.formState.errors.root.message}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end space-x-4">
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || isValidatingUsers}
                style={{ marginRight: "16px" }}
              >
                {form.formState.isSubmitting
                  ? "Creating Transfer..."
                  : "Create Transfer"}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default TransferForm;
