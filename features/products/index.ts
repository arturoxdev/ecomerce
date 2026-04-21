export type {
  ProductFormState,
  VariantFormState,
  ManualBlockFormState,
} from "./services/products-admin.service";

export {
  createProduct,
  updateProduct,
  appendProductPhoto,
  removeProductPhoto,
  toggleProductActive,
  deleteProduct,
  createVariant,
  updateVariant,
  deleteVariant,
  getProductVariants,
  getProductBlocks,
  createManualBlock,
  deleteManualBlock,
} from "./actions";

export { ProductForm } from "./components/admin/product-form";
export { ProductTable } from "./components/admin/product-table";
export { ProductFilters } from "./components/admin/product-status-filter";
export { VariantManager } from "./components/admin/variant-manager";
export { ManualBlockForm } from "./components/admin/manual-block-form";
export { AvailabilityBlockTable } from "./components/admin/availability-block-table";

export { ProductCard } from "./components/public/product-card";
export type {
  ProductCardProduct,
  ProductCardLabels,
} from "./components/public/product-card";
export { CategoryFilter } from "./components/public/category-filter";
export type { FilterCategory } from "./components/public/category-filter";
export {
  AvailabilityChecker,
  AvailabilityCheckerBody,
} from "./components/public/availability-checker";
export type {
  AvailabilityLabels,
  AvailabilityResult,
} from "./components/public/availability-checker";
export { ProductGallery } from "./components/public/product-gallery";
export { VariantSelector } from "./components/public/variant-selector";
export { ProductDetailActions } from "./components/public/product-detail-actions";
export { AddToCartButton } from "./components/public/add-to-cart-button";
export { AddToCartDialog } from "./components/public/add-to-cart-dialog";
