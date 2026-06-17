import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Hr,
  Row,
  Column,
} from "@react-email/components";
import type { NewOrderNotificationPayload } from "../types";

export function NewOrderAdminEmail(props: NewOrderNotificationPayload) {
  const brand = process.env.NEXT_PUBLIC_COLOR_PRIMARY || "#f28b0d";

  const fmt = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: props.currency,
  });

  return (
    <Html lang="es">
      <Head />
      <Body
        style={{
          backgroundColor: "#f5f5f5",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          margin: 0,
          padding: "24px 0",
        }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            maxWidth: "600px",
            margin: "0 auto",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <Section
            style={{
              backgroundColor: brand,
              padding: "24px 32px",
            }}
          >
            <Heading
              style={{
                color: "#ffffff",
                fontSize: "22px",
                fontWeight: "700",
                margin: "0",
              }}
            >
              Nueva orden #{props.orderNumber}
            </Heading>
          </Section>

          {/* Body */}
          <Section style={{ padding: "32px" }}>
            <Text
              style={{
                fontSize: "16px",
                color: "#333333",
                margin: "0 0 24px",
              }}
            >
              Se ha confirmado un nuevo pago. Aquí están los detalles:
            </Text>

            {/* Cliente */}
            <Heading
              as="h2"
              style={{
                fontSize: "14px",
                fontWeight: "700",
                color: "#666666",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: "0 0 12px",
              }}
            >
              Datos del cliente
            </Heading>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: "24px",
              }}
            >
              <tbody>
                <tr>
                  <td
                    style={{
                      padding: "6px 0",
                      color: "#666666",
                      fontSize: "14px",
                      width: "40%",
                    }}
                  >
                    Nombre
                  </td>
                  <td
                    style={{
                      padding: "6px 0",
                      color: "#333333",
                      fontSize: "14px",
                      fontWeight: "600",
                    }}
                  >
                    {props.customerName}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "6px 0",
                      color: "#666666",
                      fontSize: "14px",
                    }}
                  >
                    Correo
                  </td>
                  <td
                    style={{
                      padding: "6px 0",
                      color: "#333333",
                      fontSize: "14px",
                    }}
                  >
                    {props.customerEmail}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "6px 0",
                      color: "#666666",
                      fontSize: "14px",
                    }}
                  >
                    Teléfono
                  </td>
                  <td
                    style={{
                      padding: "6px 0",
                      color: "#333333",
                      fontSize: "14px",
                    }}
                  >
                    {props.customerPhone}
                  </td>
                </tr>
                {props.deliveryAddress && (
                  <tr>
                    <td
                      style={{
                        padding: "6px 0",
                        color: "#666666",
                        fontSize: "14px",
                        verticalAlign: "top",
                      }}
                    >
                      Dirección de entrega
                    </td>
                    <td
                      style={{
                        padding: "6px 0",
                        color: "#333333",
                        fontSize: "14px",
                      }}
                    >
                      {props.deliveryAddress}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <Hr style={{ borderColor: "#e5e5e5", margin: "0 0 24px" }} />

            {/* Artículos */}
            <Heading
              as="h2"
              style={{
                fontSize: "14px",
                fontWeight: "700",
                color: "#666666",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: "0 0 12px",
              }}
            >
              Artículos rentados
            </Heading>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: "24px",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      padding: "8px 0",
                      textAlign: "left",
                      fontSize: "12px",
                      color: "#999999",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      borderBottom: "1px solid #e5e5e5",
                    }}
                  >
                    Producto
                  </th>
                  <th
                    style={{
                      padding: "8px 0",
                      textAlign: "center",
                      fontSize: "12px",
                      color: "#999999",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      borderBottom: "1px solid #e5e5e5",
                    }}
                  >
                    Cantidad
                  </th>
                  <th
                    style={{
                      padding: "8px 0",
                      textAlign: "right",
                      fontSize: "12px",
                      color: "#999999",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      borderBottom: "1px solid #e5e5e5",
                    }}
                  >
                    Fecha de renta
                  </th>
                </tr>
              </thead>
              <tbody>
                {props.items.map((item, index) => (
                  <tr key={index}>
                    <td
                      style={{
                        padding: "10px 0",
                        fontSize: "14px",
                        color: "#333333",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                    >
                      {item.name}
                    </td>
                    <td
                      style={{
                        padding: "10px 0",
                        fontSize: "14px",
                        color: "#333333",
                        textAlign: "center",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                    >
                      {item.quantity}
                    </td>
                    <td
                      style={{
                        padding: "10px 0",
                        fontSize: "14px",
                        color: "#333333",
                        textAlign: "right",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                    >
                      {item.rentDate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Hr style={{ borderColor: "#e5e5e5", margin: "0 0 24px" }} />

            {/* Resumen de dinero */}
            <Heading
              as="h2"
              style={{
                fontSize: "14px",
                fontWeight: "700",
                color: "#666666",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: "0 0 12px",
              }}
            >
              Resumen de pago
            </Heading>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: "32px",
              }}
            >
              <tbody>
                <tr>
                  <td
                    style={{
                      padding: "8px 0",
                      fontSize: "14px",
                      color: "#666666",
                    }}
                  >
                    Total
                  </td>
                  <td
                    style={{
                      padding: "8px 0",
                      fontSize: "14px",
                      color: "#333333",
                      textAlign: "right",
                    }}
                  >
                    {fmt.format(props.totalAmount)}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "8px 0",
                      fontSize: "14px",
                      color: "#666666",
                    }}
                  >
                    Pagado en línea
                  </td>
                  <td
                    style={{
                      padding: "8px 0",
                      fontSize: "14px",
                      color: "#333333",
                      textAlign: "right",
                    }}
                  >
                    {fmt.format(props.paidOnlineAmount)}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "10px 0",
                      fontSize: "15px",
                      fontWeight: "700",
                      color: "#333333",
                      borderTop: "2px solid #e5e5e5",
                    }}
                  >
                    Saldo a cobrar en entrega
                  </td>
                  <td
                    style={{
                      padding: "10px 0",
                      fontSize: "15px",
                      fontWeight: "700",
                      color: brand,
                      textAlign: "right",
                      borderTop: "2px solid #e5e5e5",
                    }}
                  >
                    {fmt.format(props.balanceDueAmount)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* CTA */}
            <Row>
              <Column style={{ textAlign: "center" }}>
                <Button
                  href={props.adminOrderUrl}
                  style={{
                    backgroundColor: brand,
                    borderRadius: "6px",
                    color: "#ffffff",
                    display: "inline-block",
                    fontSize: "15px",
                    fontWeight: "600",
                    padding: "12px 28px",
                    textDecoration: "none",
                  }}
                >
                  Ver orden en el panel
                </Button>
              </Column>
            </Row>
          </Section>

          {/* Footer */}
          <Section
            style={{
              backgroundColor: "#f9f9f9",
              borderTop: "1px solid #e5e5e5",
              padding: "16px 32px",
            }}
          >
            <Text
              style={{
                fontSize: "12px",
                color: "#999999",
                margin: "0",
                textAlign: "center",
              }}
            >
              Este correo es una notificación interna del sistema. No responder.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
