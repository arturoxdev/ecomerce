import { revalidatePath } from "next/cache";

export function revalidateProductPages() {
  revalidatePath("/admin/products");
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/catalog", "page");
}

export function revalidateProductEdit(productId: string) {
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/[locale]/catalog", "page");
}
