import Link from "next/link";

import { canWriteData, getSessionUser } from "@/lib/services/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiteHeader } from "@/components/admin/site-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { staticPageCatalog } from "@/features/pages";

export default async function AdminPagesIndexPage() {
  const user = await getSessionUser();
  const canWrite = canWriteData(user.role);

  return (
    <>
      <SiteHeader title="Páginas" />
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Página</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Idiomas</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staticPageCatalog.map((page) => (
                    <TableRow key={page.slug}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{page.title}</p>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {page.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {page.slug}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{page.editorType}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        EN / ES
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant={canWrite ? "default" : "outline"}
                          size="sm"
                          render={<Link href={`/admin/pages/${page.slug}`} />}
                        >
                          {canWrite ? "Editar página" : "Ver página"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
