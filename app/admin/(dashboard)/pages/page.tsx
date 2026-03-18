import Link from "next/link";

import { getSessionUser } from "@/lib/auth/session";
import { canWriteData } from "@/lib/auth/permissions";
import { staticPageCatalog } from "@/lib/static-pages/catalog";

export default async function AdminPagesIndexPage() {
  const user = await getSessionUser();
  const canWrite = canWriteData(user.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Pages
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Manage the content of your public pages.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#f1f5f9] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        <table className="min-w-full divide-y divide-[#f1f5f9] text-sm">
          <thead className="bg-[#fafaf9]">
            <tr>
              <th className="px-5 py-4 text-left font-semibold text-slate-500">Page</th>
              <th className="px-5 py-4 text-left font-semibold text-slate-500">Slug</th>
              <th className="px-5 py-4 text-left font-semibold text-slate-500">Type</th>
              <th className="px-5 py-4 text-left font-semibold text-slate-500">Locales</th>
              <th className="px-5 py-4 text-right font-semibold text-slate-500">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f8f7f5]">
            {staticPageCatalog.map((page) => (
              <tr key={page.slug} className="hover:bg-[#fcfbfa]">
                <td className="px-5 py-4">
                  <div>
                    <p className="font-semibold text-slate-900">{page.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{page.description}</p>
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-600">{page.slug}</td>
                <td className="px-5 py-4">
                  <span className="inline-flex rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-semibold text-primary">
                    {page.editorType}
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-600">EN / ES</td>
                <td className="px-5 py-4 text-right">
                  <Link
                    href={`/admin/pages/${page.slug}`}
                    className={`inline-flex rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      canWrite
                        ? "bg-secondary text-white hover:bg-green-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {canWrite ? "Edit page" : "View page"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
