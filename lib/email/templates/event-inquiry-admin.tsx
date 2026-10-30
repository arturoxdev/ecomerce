import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
} from "@react-email/components";
import type { EventInquiryPayload } from "../types";

export function EventInquiryAdminEmail(props: EventInquiryPayload) {
  const brand = process.env.NEXT_PUBLIC_COLOR_PRIMARY || "#f28b0d";

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
              Nueva solicitud para evento grande
            </Heading>
          </Section>

          {/* Body */}
          <Section style={{ padding: "32px" }}>
            <Text
              style={{ fontSize: "16px", color: "#333333", margin: "0 0 16px" }}
            >
              Un visitante dejó su correo en la sección &quot;¿Planeando un
              evento grande?&quot; del inicio. Quiere información sobre
              paquetes personalizados, descuentos o fechas disponibles.
            </Text>
            <Text
              style={{
                fontSize: "18px",
                fontWeight: "700",
                color: "#333333",
                margin: "0 0 16px",
              }}
            >
              {props.email}
            </Text>
            <Text style={{ fontSize: "14px", color: "#666666", margin: "0" }}>
              Idioma del sitio: {props.locale === "es" ? "Español" : "Inglés"}.
              Responde a este correo para contestarle directamente.
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
              Enviado desde el formulario del inicio del sitio.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
