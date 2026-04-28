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
import { AvatarInitials } from "@/components/admin/avatar-initials";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RoleBadge } from "@/components/admin/role-badge";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UserRole } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

import { toggleUserActive } from "../../actions";

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

const headCellCn =
  "h-auto px-[22px] py-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground";
const bodyCellCn = "px-[22px] py-[11px]";

export function UserTable({ users, currentUserRole }: Props) {
  const {
    targetId: toggleId,
    isPending,
    openDialog: setToggleId,
    closeDialog,
    confirmDelete,
  } = useDeleteDialog();

  void currentUserRole;

  function handleToggle() {
    confirmDelete(toggleUserActive, "User status updated");
  }

  return (
    <>
      <Card className="gap-0 py-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-sidebar">
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className={cn(headCellCn, "w-[60px]")} />
                <TableHead className={cn(headCellCn, "w-[20%]")}>Name</TableHead>
                <TableHead className={cn(headCellCn)}>Email</TableHead>
                <TableHead className={cn(headCellCn, "w-[110px]")}>
                  Role
                </TableHead>
                <TableHead className={cn(headCellCn, "w-[120px]")}>
                  Status
                </TableHead>
                <TableHead className={cn(headCellCn, "w-[140px]")}>
                  Created
                </TableHead>
                <TableHead className={cn(headCellCn, "w-[110px] text-right")}>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.id}
                  className={cn(
                    "border-b border-border last:border-b-0 hover:bg-transparent",
                    !user.isActive && "opacity-60",
                  )}
                >
                  <TableCell className={cn(bodyCellCn, "py-2")}>
                    <AvatarInitials
                      name={user.name ?? user.email}
                      seed={user.id}
                    />
                  </TableCell>
                  <TableCell
                    className={cn(
                      bodyCellCn,
                      "text-[13px] font-semibold text-foreground",
                    )}
                  >
                    {user.name ?? "—"}
                  </TableCell>
                  <TableCell
                    className={cn(bodyCellCn, "text-[13px] text-muted-foreground")}
                  >
                    {user.email}
                  </TableCell>
                  <TableCell className={bodyCellCn}>
                    <RoleBadge role={user.role} />
                  </TableCell>
                  <TableCell className={bodyCellCn}>
                    {user.role !== "ROOT" ? (
                      <button
                        type="button"
                        onClick={() => setToggleId(user.id)}
                        disabled={isPending}
                        className="cursor-pointer disabled:opacity-60"
                      >
                        <StatusBadge
                          state={user.isActive ? "active" : "inactive"}
                        />
                      </button>
                    ) : (
                      <StatusBadge state="active" />
                    )}
                  </TableCell>
                  <TableCell
                    className={cn(
                      bodyCellCn,
                      "font-mono text-xs text-muted-foreground",
                    )}
                  >
                    {user.createdAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className={cn(bodyCellCn, "py-2")}>
                    <div className="flex items-center justify-end gap-1.5">
                      {user.role !== "ROOT" && (
                        <>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            className="text-muted-foreground"
                            render={
                              <Link href={`/admin/users/${user.id}/edit`} />
                            }
                            aria-label="Edit user"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => setToggleId(user.id)}
                            aria-label="Toggle user active"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </>
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
              Are you sure you want to change this user&apos;s active status? If
              deactivated, their session will be invalidated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggle}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
