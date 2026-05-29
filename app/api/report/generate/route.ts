import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { GreenSnapReport, type ReportData } from "@/lib/pdf-template";
import { InvoiceReport, type InvoiceReportData } from "@/lib/pdf-invoice-template";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const render = renderToBuffer as (element: any) => Promise<Buffer>;

const DEMO_NOTES =
  "Heg gesnoeid aan de voorzijde (ca. 15 meter). Borders bijgewerkt en onkruid verwijderd. " +
  "Gazon gemaaid en randen gestoken. Let op: appelboom in de achtertuin heeft een dode tak, " +
  "advies om deze door een boomverzorger te laten verwijderen voor de herfst.";

const today = () =>
  new Date().toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

function dueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const style = body.style ?? "report";

  if (style === "invoice") {
    const data: InvoiceReportData = {
      invoiceNumber: body.invoiceNumber ?? "2026-0042",
      date: body.date ?? today(),
      dueDate: body.dueDate ?? dueDate(),
      company: body.company ?? {
        name: "GroenWerk Hengelo",
        address: "Industrieweg 12",
        postcode: "7553 CA Hengelo",
        phone: "+31 (0)74 123 4567",
        email: "info@groenwerk-hengelo.nl",
        kvk: "12345678",
        btw: "NL123456789B01",
        iban: "NL91 ABNA 0417 1643 00",
      },
      client: body.client ?? {
        name: "Fam. De Groot",
        address: "Deldenerstraat 42",
        postcode: "7551 AB Hengelo",
      },
      worker: body.worker ?? "Kees Jansen",
      lineItems: body.lineItems ?? [
        { description: "Heg snoeien voorzijde (ca. 15m)", quantity: 1, unit: "klus", unitPrice: 85.0 },
        { description: "Borders bijwerken en onkruid verwijderen", quantity: 2, unit: "uur", unitPrice: 45.0 },
        { description: "Gazon maaien en randen steken", quantity: 1.5, unit: "uur", unitPrice: 45.0 },
        { description: "Groenafval afvoeren", quantity: 1, unit: "vracht", unitPrice: 35.0 },
      ],
      notes: body.notes ?? DEMO_NOTES,
      beforePhoto: body.beforePhoto ?? undefined,
      afterPhoto: body.afterPhoto ?? undefined,
      beforeTime: body.beforeTime ?? "08:32",
      afterTime: body.afterTime ?? "11:45",
    };

    const buffer = await render(
      React.createElement(InvoiceReport, { data })
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="factuur-${data.invoiceNumber}.pdf"`,
      },
    });
  }

  // Default: report style
  const data: ReportData = {
    reportNumber: body.reportNumber ?? `GS-${Date.now().toString(36).toUpperCase()}`,
    date: body.date ?? today(),
    company: body.company ?? {
      name: "GroenWerk Hengelo",
      address: "Industrieweg 12, 7553 CA Hengelo",
      phone: "+31 (0)74 123 4567",
      email: "info@groenwerk-hengelo.nl",
    },
    client: body.client ?? {
      name: "Fam. De Groot",
      address: "Deldenerstraat 42, Hengelo",
    },
    worker: body.worker ?? "Kees Jansen",
    jobDescription:
      body.jobDescription ?? "Tuinonderhoud: heg snoeien, borders bijwerken, gazon maaien",
    notes: body.notes ?? DEMO_NOTES,
    beforePhoto: body.beforePhoto ?? undefined,
    afterPhoto: body.afterPhoto ?? undefined,
    beforeTime: body.beforeTime ?? "08:32",
    afterTime: body.afterTime ?? "11:45",
  };

  const buffer = await render(
    React.createElement(GreenSnapReport, { data })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="rapport-${data.reportNumber}.pdf"`,
    },
  });
}

// GET: generate both demo variants
export async function GET(request: NextRequest) {
  const style = request.nextUrl.searchParams.get("style") ?? "report";

  if (style === "invoice") {
    const data: InvoiceReportData = {
      invoiceNumber: "2026-0042",
      date: today(),
      dueDate: dueDate(),
      company: {
        name: "GroenWerk Hengelo",
        address: "Industrieweg 12",
        postcode: "7553 CA Hengelo",
        phone: "+31 (0)74 123 4567",
        email: "info@groenwerk-hengelo.nl",
        kvk: "12345678",
        btw: "NL123456789B01",
        iban: "NL91 ABNA 0417 1643 00",
      },
      client: {
        name: "Fam. De Groot",
        address: "Deldenerstraat 42",
        postcode: "7551 AB Hengelo",
      },
      worker: "Kees Jansen",
      lineItems: [
        { description: "Heg snoeien voorzijde (ca. 15m)", quantity: 1, unit: "klus", unitPrice: 85.0 },
        { description: "Borders bijwerken en onkruid verwijderen", quantity: 2, unit: "uur", unitPrice: 45.0 },
        { description: "Gazon maaien en randen steken", quantity: 1.5, unit: "uur", unitPrice: 45.0 },
        { description: "Groenafval afvoeren", quantity: 1, unit: "vracht", unitPrice: 35.0 },
      ],
      notes: DEMO_NOTES,
      beforeTime: "08:32",
      afterTime: "11:45",
    };

    const buffer = await render(
      React.createElement(InvoiceReport, { data })
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="factuur-demo.pdf"`,
      },
    });
  }

  // Default: report
  const data: ReportData = {
    reportNumber: "GS-2026-0042",
    date: today(),
    company: {
      name: "GroenWerk Hengelo",
      address: "Industrieweg 12, 7553 CA Hengelo",
      phone: "+31 (0)74 123 4567",
      email: "info@groenwerk-hengelo.nl",
    },
    client: {
      name: "Fam. De Groot",
      address: "Deldenerstraat 42, Hengelo",
    },
    worker: "Kees Jansen",
    jobDescription: "Tuinonderhoud: heg snoeien, borders bijwerken, gazon maaien",
    notes: DEMO_NOTES,
    beforeTime: "08:32",
    afterTime: "11:45",
  };

  const buffer = await render(
    React.createElement(GreenSnapReport, { data })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="rapport-demo.pdf"`,
    },
  });
}
