import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  type DocumentProps,
} from "@react-pdf/renderer";

import {
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
} from "@/lib/admin/labels";
import { formatAdminDate, formatAdminDateTime } from "@/lib/admin/format";
import { siteConfig } from "@/lib/config/site";
import { toDisplayDate } from "@/lib/date";

import type { findByIdWithItems } from "../../services/orders.service";

export type OrderTicketOrder = NonNullable<
  Awaited<ReturnType<typeof findByIdWithItems>>
>;

const PRIMARY = process.env.NEXT_PUBLIC_COLOR_PRIMARY ?? "#f28b0d";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#111827",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: PRIMARY,
    paddingBottom: 12,
    marginBottom: 16,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { height: 36, width: 36, objectFit: "contain" },
  siteName: { fontSize: 18, fontFamily: "Helvetica-Bold", color: PRIMARY },
  ticketLabel: { fontSize: 9, color: MUTED, textAlign: "right" },
  shortId: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
    marginTop: 2,
  },
  fullId: { fontSize: 7, color: MUTED, textAlign: "right", marginTop: 2 },
  metaRow: { flexDirection: "row", gap: 24, marginBottom: 16 },
  metaLabel: { fontSize: 8, color: MUTED, marginBottom: 2 },
  metaValue: { fontSize: 10 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  customerBox: {
    flexDirection: "row",
    gap: 24,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
  },
  customerCol: { flex: 1, gap: 3 },
  muted: { color: MUTED },
  table: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRowLast: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  th: { fontSize: 8, fontFamily: "Helvetica-Bold", color: MUTED },
  colProduct: { flex: 4, paddingRight: 6 },
  colDate: { flex: 2 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1.5, textAlign: "right" },
  colSubtotal: { flex: 1.5, textAlign: "right" },
  productName: { fontFamily: "Helvetica-Bold" },
  itemDetail: { fontSize: 8, color: MUTED, marginTop: 1 },
  summaryWrap: { flexDirection: "row", justifyContent: "flex-end" },
  summary: { width: 240, gap: 4 },
  summaryLine: { flexDirection: "row", justifyContent: "space-between" },
  totalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 6,
    marginTop: 2,
  },
  totalText: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  paidText: { color: PRIMARY, fontFamily: "Helvetica-Bold" },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 7, color: MUTED },
});

// Intersects DocumentProps so the resulting element satisfies
// renderToBuffer's ReactElement<DocumentProps> parameter.
type Props = DocumentProps & {
  order: OrderTicketOrder;
  generatedAt: Date;
};

export function OrderTicketDocument({ order, generatedAt }: Props) {
  const money = new Intl.NumberFormat("es", {
    style: "currency",
    currency: order.currency,
    currencyDisplay: "code",
  });
  const fmt = (value: string | number) => {
    const n = typeof value === "string" ? parseFloat(value) : value;
    return money.format(Number.isFinite(n) ? n : 0);
  };

  const shortId = order.id.slice(0, 8).toUpperCase();
  const totalNum = parseFloat(order.total);
  const paidNum = parseFloat(order.amountPaid);
  const balanceNum = Math.max(0, totalNum - paidNum);
  const isSplit = paidNum > 0 && paidNum < totalNum;
  const servicesTotalNum = parseFloat(order.servicesTotal);
  const deliveryFeeNum = parseFloat(order.deliveryFee);
  const address = [order.deliveryAddress, order.city, order.zipCode]
    .filter(Boolean)
    .join(", ");

  return (
    <Document title={`Ticket de orden #${shortId}`} author={siteConfig.name}>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brand}>
            {siteConfig.logoUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, not a DOM <img>
              <Image src={siteConfig.logoUrl} style={styles.logo} />
            ) : null}
            <Text style={styles.siteName}>{siteConfig.name}</Text>
          </View>
          <View>
            <Text style={styles.ticketLabel}>TICKET DE ORDEN</Text>
            <Text style={styles.shortId}>#{shortId}</Text>
            <Text style={styles.fullId}>{order.id}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View>
            <Text style={styles.metaLabel}>FECHA DE CREACIÓN</Text>
            <Text style={styles.metaValue}>
              {formatAdminDateTime(order.createdAt)}
            </Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>ESTADO</Text>
            <Text style={styles.metaValue}>
              {ORDER_STATUS_LABEL[order.status]}
            </Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>PAGO</Text>
            <Text style={styles.metaValue}>
              {PAYMENT_STATUS_LABEL[order.paymentStatus]} ·{" "}
              {PAYMENT_METHOD_LABEL[order.paymentMethod]}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Cliente</Text>
        <View style={styles.customerBox}>
          <View style={styles.customerCol}>
            <Text style={styles.productName}>{order.customerName}</Text>
            <Text style={styles.muted}>{order.customerEmail}</Text>
            <Text style={styles.muted}>{order.customerPhone}</Text>
          </View>
          <View style={styles.customerCol}>
            {address ? <Text style={styles.muted}>{address}</Text> : null}
            {order.eventStartTime ? (
              <Text>
                <Text style={styles.muted}>Hora de inicio del evento: </Text>
                {order.eventStartTime}
              </Text>
            ) : null}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Artículos</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colProduct]}>PRODUCTO</Text>
            <Text style={[styles.th, styles.colDate]}>FECHA DE RENTA</Text>
            <Text style={[styles.th, styles.colQty]}>CANT.</Text>
            <Text style={[styles.th, styles.colPrice]}>PRECIO UNIT.</Text>
            <Text style={[styles.th, styles.colSubtotal]}>SUBTOTAL</Text>
          </View>
          {order.orderItems.map((item, index) => (
            <View
              key={item.id}
              style={
                index === order.orderItems.length - 1 && !order.services.length
                  ? styles.tableRowLast
                  : styles.tableRow
              }
            >
              <View style={styles.colProduct}>
                <Text style={styles.productName}>{item.product.name}</Text>
                {item.variant?.name ? (
                  <Text style={styles.itemDetail}>{item.variant.name}</Text>
                ) : null}
                {item.services.map((service) => (
                  <Text key={service.id} style={styles.itemDetail}>
                    + {service.name} ({fmt(service.price)})
                  </Text>
                ))}
              </View>
              <Text style={styles.colDate}>
                {formatAdminDate(toDisplayDate(item.rentDate))}
              </Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{fmt(item.unitPrice)}</Text>
              <Text style={styles.colSubtotal}>{fmt(item.subtotal)}</Text>
            </View>
          ))}
          {order.services.map((service, index) => (
            <View
              key={service.id}
              style={
                index === order.services.length - 1
                  ? styles.tableRowLast
                  : styles.tableRow
              }
            >
              <View style={styles.colProduct}>
                <Text>{service.name}</Text>
                <Text style={styles.itemDetail}>Servicio de la orden</Text>
              </View>
              <Text style={styles.colDate}>—</Text>
              <Text style={styles.colQty}>1</Text>
              <Text style={styles.colPrice}>{fmt(service.price)}</Text>
              <Text style={styles.colSubtotal}>{fmt(service.price)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summaryWrap}>
          <View style={styles.summary}>
            <View style={styles.summaryLine}>
              <Text style={styles.muted}>Subtotal</Text>
              <Text>{fmt(order.subtotal)}</Text>
            </View>
            {servicesTotalNum > 0 ? (
              <View style={styles.summaryLine}>
                <Text style={styles.muted}>Servicios adicionales</Text>
                <Text>{fmt(servicesTotalNum)}</Text>
              </View>
            ) : null}
            <View style={styles.summaryLine}>
              <Text style={styles.muted}>Entrega</Text>
              <Text>{deliveryFeeNum === 0 ? "Incluida" : fmt(deliveryFeeNum)}</Text>
            </View>
            <View style={styles.totalLine}>
              <Text style={styles.totalText}>Total</Text>
              <Text style={styles.totalText}>{fmt(totalNum)}</Text>
            </View>
            <View style={styles.summaryLine}>
              <Text style={styles.muted}>
                Pagado en línea
                {isSplit
                  ? " (50%)"
                  : paidNum >= totalNum && totalNum > 0
                    ? " (100%)"
                    : ""}
              </Text>
              <Text style={styles.paidText}>{fmt(paidNum)}</Text>
            </View>
            {balanceNum > 0 ? (
              <View style={styles.summaryLine}>
                <Text style={styles.muted}>
                  Saldo a la entrega{isSplit ? " (50%)" : ""}
                </Text>
                <Text style={styles.productName}>{fmt(balanceNum)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {siteConfig.name} — Orden {order.id}
          </Text>
          <Text style={styles.footerText}>
            Generado el {formatAdminDateTime(generatedAt)}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
