"use client";

import { Pencil } from "lucide-react";
import Link from "next/link";

import { useDeleteDialog } from "@/hooks/use-delete-dialog";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UserRole } from "@/lib/db/schema";

import { toggleUserActive } from "../actions";

type User = {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
};

type Props = {
  users: User[];
  currentUserRole: UserRole;
};

const roleBadgeVariant: Record<UserRole, "default" | "secondary" | "outline"> = {
  ROOT: "default",
  ADMIN: "secondary",
  EMPLOYEE: "outline",
};

export function UserTable({ users, currentUserRole }: Props) {
  const { targetId: toggleId, isPending, openDialog: setToggleId, closeDialog, confirmDelete } = useDeleteDialog();

  function handleToggle() {
    confirmDelete(toggleUserActive, "User status updated");
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.id}
                  className={!user.isActive ? "opacity-60" : ""}
                >
                  <TableCell className="font-medium">
                    {user.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant={roleBadgeVariant[user.role]}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.role !== "ROOT" ? (
                      <button
                        onClick={() => setToggleId(user.id)}
                        disabled={isPending}
                        className="cursor-pointer"
                      >
                        <Badge variant="outline" className={user.isActive ? "border-green-200 bg-green-50 text-green-700" : ""}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </button>
                    ) : (
                      <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.createdAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {user.role !== "ROOT" && (
                        <Button variant="ghost" size="icon" className="size-7" render={<Link href={`/admin/users/${user.id}/edit`} />}>
                          <Pencil className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!toggleId} onOpenChange={(o) => !o && closeDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Toggle user status</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change this user&apos;s active status? If deactivated, their session will be invalidated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggle}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
