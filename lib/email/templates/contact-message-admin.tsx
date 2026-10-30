import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
} from "@react-email/components";
import type { ContactMessagePayload } from "../types";

const labelCell = {
  padding: "6px 0",
  color: "#666666",
  fontSize: "14px",
  width: "40%",
  verticalAlign: "top",
} as const;

const valueCell = {
  padding: "6px 0",
  color: "#333333",
  fontSize: "14px",
} as const;

export function ContactMessageAdminEmail(props: ContactMessagePayload) {
  const brand = process.env.NEXT_PUBLIC_COLOR_PRIMARY || "#f28b0d";

  const rows: Array<[string, string]> = [
    ["Nombre", props.name],
    ["Correo", props.email],
    ["Teléfono", props.phone ?? "—"],
    ["Fecha del evento", props.eventDate ?? "—"],
    ["Idioma del sitio", props.locale === "es" ? "Español" : "Inglés"],
  ];

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
          <Section style={{ backgroundColor: brand, padding: "24px 32px" }}>
            <Heading
              style={{
                color: "#ffffff",
                fontSize: "22px",
                fontWeight: "700",
                margin: "0",
              }}
            >
              Nuevo mensaje de contacto
            </Heading>
          </Section>

          {/* Body */}
          <Section style={{ padding: "32px" }}>
            <Text
              style={{ fontSize: "16px", color: "#333333", margin: "0 0 24px" }}
            >
              Alguien envió el formulario de contacto del sitio. Responde a este
              correo para contestarle directamente.
            </Text>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: "24px",
              }}
            >
              <tbody>
                {rows.map(([label, value]) => (
                  <tr key={label}>
                    <td style={labelCell}>{label}</td>
                    <td style={{ ...valueCell, fontWeight: "600" }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

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
              Mensaje
            </Heading>
            <Text
              style={{
                fontSize: "15px",
                color: "#333333",
                lineHeight: "1.6",
                margin: "0",
                whiteSpace: "pre-wrap",
              }}
            >
              {props.message}
            </Text>
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
              Enviado desde el formulario de contacto del sitio.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
