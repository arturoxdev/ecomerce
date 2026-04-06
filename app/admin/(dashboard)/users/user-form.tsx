"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserRole } from "@/lib/db/schema";

import { isFormError, getFieldErrors, type FormState as UserFormState } from "@/lib/types/form-state";

type User = {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  isActive: boolean;
};

type Props = {
  action: (prev: UserFormState, formData: FormData) => Promise<UserFormState>;
  assignableRoles: UserRole[];
  user?: User;
};

export function UserForm({ action, assignableRoles, user }: Props) {
  const [state, formAction, pending] = useActionState(action, {} as UserFormState);
  const fieldErrors = getFieldErrors(state);
  const router = useRouter();

  return (
    <form action={formAction} className="space-y-6">
      {isFormError(state) && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {state.detail ?? state.title}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={user?.name ?? ""}
          required
        />
        {fieldErrors?.name && (
          <p className="text-sm text-red-600">{fieldErrors.name[0]}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={user?.email ?? ""}
          required
        />
        {fieldErrors?.email && (
          <p className="text-sm text-red-600">{fieldErrors.email[0]}</p>
        )}
      </div>

      {!user && (
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Minimum 8 characters"
            required
          />
          {fieldErrors?.password && (
            <p className="text-sm text-red-600">{fieldErrors.password[0]}</p>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="role">Role</Label>
        <p className="text-xs text-gray-500">
          Determines what this user can do in the admin panel
        </p>
        <select
          id="role"
          name="role"
          defaultValue={user?.role ?? assignableRoles[assignableRoles.length - 1]}
          className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-400 focus:outline-none"
        >
          {assignableRoles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="isActive"
          name="isActive"
          value="true"
          defaultChecked={user?.isActive ?? true}
          className="size-4 rounded border-gray-300"
        />
        <Label htmlFor="isActive" className="cursor-pointer">
          Active (can sign in to admin panel)
        </Label>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Saving…"
            : user
              ? "Save changes"
              : "Create user"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
