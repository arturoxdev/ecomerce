"use client";

import { Pencil, Trash2 } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UserRole } from "@/lib/db/schema";

import { toggleUserActive } from "./actions";

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

const roleBadgeStyles: Record<UserRole, string> = {
  ROOT: "bg-purple-100 text-purple-700",
  ADMIN: "bg-orange-100 text-orange-700",
  EMPLOYEE: "bg-blue-100 text-blue-700",
};

export function UserTable({ users, currentUserRole }: Props) {
  const { targetId: toggleId, isPending, openDialog: setToggleId, closeDialog, confirmDelete } = useDeleteDialog();

  function handleToggle() {
    confirmDelete(toggleUserActive, "User status updated");
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
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
                className={`hover:bg-gray-50 ${!user.isActive ? "opacity-60" : ""}`}
              >
                <TableCell className="font-medium">
                  {user.name ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {user.email}
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${roleBadgeStyles[user.role]}`}
                  >
                    {user.role}
                  </span>
                </TableCell>
                <TableCell>
                  {user.role !== "ROOT" ? (
                    <button
                      onClick={() => setToggleId(user.id)}
                      disabled={isPending}
                      className="cursor-pointer"
                    >
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          user.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </button>
                  ) : (
                    <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Active
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {user.createdAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {user.role !== "ROOT" && (
                      <Link
                        href={`/admin/users/${user.id}/edit`}
                        className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <Pencil className="size-4" />
                      </Link>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
