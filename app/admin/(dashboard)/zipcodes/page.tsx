import { SiteHeader } from "@/components/admin/site-header";
import {
  countZipcodes,
  findAllZipcodes,
} from "@/features/zipcodes/services/zipcodes.service";
import { ZipcodeTable } from "@/features/zipcodes";
import { canWriteData, getSessionUser } from "@/lib/services/auth";

const PAGE_SIZE = 25;

export default async function AdminZipcodesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await getSessionUser();
  const canWrite = canWriteData(user.role);
  const { q = "", page = "1" } = await searchParams;

  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
  const offset = (pageNumber - 1) * PAGE_SIZE;

  const [rows, total] = await Promise.all([
    findAllZipcodes({ search: q, limit: PAGE_SIZE, offset }),
    countZipcodes({ search: q }),
  ]);

  const zipcodes = rows.map((row) => ({
    id: row.id,
    city: row.city,
    zipCode: row.zipCode,
    fee: row.fee,
  }));

  return (
    <>
      <SiteHeader
        title="Códigos postales"
        subtitle={`${total} zipcode${total === 1 ? "" : "s"}`}
      />
      <div className="flex flex-col gap-3.5 px-7 pt-5 pb-7">
        <ZipcodeTable
          zipcodes={zipcodes}
          total={total}
          page={pageNumber}
          pageSize={PAGE_SIZE}
          search={q}
          canWrite={canWrite}
        />
      </div>
    </>
  );
}
