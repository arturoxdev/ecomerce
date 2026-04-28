import { getAssignableRoles, getSessionUser } from "@/lib/services/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SiteHeader } from "@/components/admin/site-header";

import { createUser, UserForm } from "@/features/users";

export default async function NewUserPage() {
  const currentUser = await getSessionUser();
  const assignableRoles = getAssignableRoles(currentUser.role);

  if (assignableRoles.length === 0) {
    return (
      <>
        <SiteHeader title="Nuevo usuario" />
        <div className="flex flex-1 flex-col items-center justify-center py-24">
          <h2 className="text-lg font-medium">Acceso denegado</h2>
          <p className="mt-2 text-sm text-muted-foreground">No puedes crear usuarios.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <SiteHeader title="Nuevo usuario" />
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="mx-auto w-full max-w-lg px-4 lg:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Datos del usuario</CardTitle>
              <CardDescription>
                Crea un nuevo usuario del panel administrador.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserForm action={createUser} assignableRoles={assignableRoles} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
