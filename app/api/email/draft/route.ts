import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { GreenSnapReport, type ReportData } from "@/lib/pdf-template";
import { InvoiceReport, type InvoiceReportData } from "@/lib/pdf-invoice-template";
import { buildEml } from "@/lib/eml-builder";
import { getServerClient } from "@/lib/supabase";
import { PHOTOS_BUCKET, SIGNED_URL_EXPIRY_SECONDS } from "@/lib/constants";
import { formatDutchDate } from "@/lib/date-utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const render = renderToBuffer as (element: any) => Promise<Buffer>;

interface RequestBody {
  jobId: string;
  emailFrom?: string;
  emailTo: string;
  emailSubject: string;
  emailBody: string;
  pdfStyle?: "invoice" | "report";
  notes?: string;
}

function safeFilename(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as RequestBody | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { jobId, emailFrom, emailTo, emailSubject, emailBody, pdfStyle, notes } = body;

  if (!jobId || !emailTo || !emailSubject || !emailBody) {
    return NextResponse.json(
      { error: "jobId, emailTo, emailSubject en emailBody zijn verplicht" },
      { status: 400 }
    );
  }

  const supabase = getServerClient();

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select(
      "id, status, scheduled_date, notes, client:clients(id, name, address), user:users(id, name)"
    )
    .eq("id", jobId)
    .maybeSingle();

  if (jobError) {
    return NextResponse.json({ error: jobError.message }, { status: 500 });
  }
  if (!job) {
    return NextResponse.json({ error: "Opdracht niet gevonden" }, { status: 404 });
  }

  // Fetch photos for PDF
  const { data: photos } = await supabase
    .from("photos")
    .select("id, type, storage_path, taken_at")
    .eq("job_id", jobId)
    .order("taken_at", { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = (job.client as any) ?? null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (job.user as any) ?? null;

  const beforePhoto = photos?.find((p) => p.type === "before");
  const afterPhoto = photos?.find((p) => p.type === "after");

  const beforeUrl = beforePhoto
    ? (
        await supabase.storage
          .from(PHOTOS_BUCKET)
          .createSignedUrl(beforePhoto.storage_path, SIGNED_URL_EXPIRY_SECONDS)
      ).data?.signedUrl ?? undefined
    : undefined;
  const afterUrl = afterPhoto
    ? (
        await supabase.storage
          .from(PHOTOS_BUCKET)
          .createSignedUrl(afterPhoto.storage_path, SIGNED_URL_EXPIRY_SECONDS)
      ).data?.signedUrl ?? undefined
    : undefined;

  const dateStr = formatDutchDate(job.scheduled_date);
  const dueDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return formatDutchDate(d);
  })();
  const finalNotes = notes ?? job.notes ?? "";

  // Render PDF
  let pdfBuffer: Buffer;
  if (pdfStyle === "report") {
    const data: ReportData = {
      reportNumber: `GS-${jobId.slice(0, 8).toUpperCase()}`,
      date: dateStr,
      company: {
        name: "GroenWerk Hengelo",
        address: "Industrieweg 12, 7553 CA Hengelo",
        phone: "+31 (0)74 123 4567",
        email: "info@groenwerk-hengelo.nl",
      },
      client: {
        name: client?.name ?? "Onbekend",
        address: client?.address ?? "",
      },
      worker: user?.name ?? "Onbekend",
      jobDescription: "Tuinonderhoud volgens opdracht",
      notes: finalNotes,
      beforePhoto: beforeUrl,
      afterPhoto: afterUrl,
    };
    pdfBuffer = await render(React.createElement(GreenSnapReport, { data }));
  } else {
    const data: InvoiceReportData = {
      invoiceNumber: jobId.slice(0, 8).toUpperCase(),
      date: dateStr,
      dueDate,
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
        name: client?.name ?? "Onbekend",
        address: client?.address ?? "",
        postcode: "",
      },
      worker: user?.name ?? "Onbekend",
      lineItems: [
        { description: "Tuinonderhoud", quantity: 1, unit: "klus", unitPrice: 0 },
      ],
      notes: finalNotes,
      beforePhoto: beforeUrl,
      afterPhoto: afterUrl,
    };
    pdfBuffer = await render(React.createElement(InvoiceReport, { data }));
  }

  // Build .eml
  const clientNameSafe = safeFilename(client?.name ?? "klant");
  const datePart = job.scheduled_date;
  const pdfFilename = `rapport-${clientNameSafe}-${datePart}.pdf`;

  const eml = buildEml({
    from: emailFrom ?? "geen-reply@greensnap.local",
    to: emailTo,
    subject: emailSubject,
    body: emailBody,
    attachments: [
      {
        filename: pdfFilename,
        contentType: "application/pdf",
        data: pdfBuffer,
      },
    ],
  });

  const emlFilename = `concept-${clientNameSafe}-${datePart}.eml`;

  return new NextResponse(eml, {
    headers: {
      "Content-Type": "message/rfc822",
      "Content-Disposition": `attachment; filename="${emlFilename}"`,
    },
  });
}
