"use server";

import { redirect } from "next/navigation";

import {
  createProduct as dalCreateProduct,
  updateProduct as dalUpdateProduct,
  appendProductPhoto as dalAppendPhoto,
  removeProductPhoto as dalRemovePhoto,
  toggleProductActive as dalToggleActive,
  deleteProduct as dalDeleteProduct,
  createVariant as dalCreateVariant,
  updateVariant as dalUpdateVariant,
  deleteVariant as dalDeleteVariant,
  getProductVariants as dalGetVariants,
  getProductBlocks as dalGetBlocks,
  createManualBlock as dalCreateBlock,
  deleteManualBlock as dalDeleteBlock,
} from "@/lib/data/products";
import type {
  ProductFormState,
  VariantFormState,
  ManualBlockFormState,
} from "@/lib/data/products";

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const result = await dalCreateProduct(_prev, formData);
  if ("success" in result) redirect("/admin/products");
  return result;
}

export async function updateProduct(
  id: string,
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  return dalUpdateProduct(id, _prev, formData);
}

export async function appendProductPhoto(
  productId: string,
  url: string,
) {
  return dalAppendPhoto(productId, url);
}

export async function removeProductPhoto(
  productId: string,
  url: string,
) {
  return dalRemovePhoto(productId, url);
}

export async function toggleProductActive(productId: string) {
  return dalToggleActive(productId);
}

export async function deleteProduct(id: string) {
  return dalDeleteProduct(id);
}

export async function createVariant(
  productId: string,
  _prev: VariantFormState,
  formData: FormData,
): Promise<VariantFormState> {
  return dalCreateVariant(productId, _prev, formData);
}

export async function updateVariant(
  variantId: string,
  _prev: VariantFormState,
  formData: FormData,
): Promise<VariantFormState> {
  return dalUpdateVariant(variantId, _prev, formData);
}

export async function deleteVariant(variantId: string) {
  return dalDeleteVariant(variantId);
}

export async function getProductVariants(productId: string) {
  return dalGetVariants(productId);
}

export async function getProductBlocks(productId: string) {
  return dalGetBlocks(productId);
}

export async function createManualBlock(
  productId: string,
  _prev: ManualBlockFormState,
  formData: FormData,
): Promise<ManualBlockFormState> {
  return dalCreateBlock(productId, _prev, formData);
}

export async function deleteManualBlock(blockId: string) {
  return dalDeleteBlock(blockId);
}
