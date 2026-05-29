import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { GreenSnapReport, type ReportData } from "@/lib/pdf-template";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const render = renderToBuffer as (element: any) => Promise<Buffer>;

export async function POST(request: NextRequest) {
  const body = await request.json();

  const data: ReportData = {
    reportNumber: body.reportNumber ?? `GS-${Date.now().toString(36).toUpperCase()}`,
    date:
      body.date ??
      new Date().toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
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
      body.jobDescription ??
      "Tuinonderhoud: heg snoeien, borders bijwerken, gazon maaien",
    notes:
      body.notes ??
      "Heg gesnoeid aan de voorzijde (ca. 15 meter). Borders bijgewerkt en onkruid verwijderd. " +
        "Gazon gemaaid en randen gestoken. Let op: appelboom in de achtertuin heeft een dode tak, " +
        "advies om deze door een boomverzorger te laten verwijderen voor de herfst.",
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

export async function GET() {
  const demoData: ReportData = {
    reportNumber: "GS-2026-0042",
    date: new Date().toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
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
    jobDescription:
      "Tuinonderhoud: heg snoeien, borders bijwerken, gazon maaien",
    notes:
      "Heg gesnoeid aan de voorzijde (ca. 15 meter). Borders bijgewerkt en onkruid verwijderd. " +
      "Gazon gemaaid en randen gestoken. Let op: appelboom in de achtertuin heeft een dode tak, " +
      "advies om deze door een boomverzorger te laten verwijderen voor de herfst.",
    beforeTime: "08:32",
    afterTime: "11:45",
  };

  const buffer = await render(
    React.createElement(GreenSnapReport, { data: demoData })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="rapport-demo.pdf"`,
    },
  });
}
