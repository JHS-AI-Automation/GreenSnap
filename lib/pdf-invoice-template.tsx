import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

Font.register({
  family: "Inter",
  fonts: [
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hjQ.ttf", fontWeight: 600 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hjQ.ttf", fontWeight: 700 },
  ],
});

const GREEN = "#16a34a";
const DARK = "#111827";
const GRAY = "#6b7280";
const LIGHT = "#f9fafb";
const BORDER = "#e5e7eb";

const s = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 9,
    color: DARK,
    paddingTop: 40,
    paddingBottom: 80,
    paddingHorizontal: 50,
  },

  // Top bar
  topBar: {
    height: 4,
    backgroundColor: GREEN,
    marginBottom: 30,
    marginHorizontal: -50,
    marginTop: -40,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  companyName: {
    fontSize: 20,
    fontWeight: 700,
    color: DARK,
    letterSpacing: -0.3,
  },
  companyDetails: {
    fontSize: 8,
    color: GRAY,
    lineHeight: 1.6,
    marginTop: 4,
  },
  invoiceTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: DARK,
    textAlign: "right",
    letterSpacing: -0.5,
  },
  invoiceNumber: {
    fontSize: 10,
    color: GRAY,
    textAlign: "right",
    marginTop: 2,
  },

  // Client + invoice meta
  metaRow: {
    flexDirection: "row",
    marginBottom: 28,
    gap: 40,
  },
  metaBlock: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 7,
    fontWeight: 600,
    color: GRAY,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingBottom: 4,
  },
  metaValue: {
    fontSize: 10,
    fontWeight: 600,
  },
  metaDetail: {
    fontSize: 9,
    color: GRAY,
    marginTop: 1,
  },

  // Line items table
  table: {
    marginBottom: 20,
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: DARK,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableHeadText: {
    color: "white",
    fontSize: 7,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableRowAlt: {
    backgroundColor: LIGHT,
  },
  tableCell: {
    fontSize: 9,
  },
  tableCellBold: {
    fontSize: 9,
    fontWeight: 600,
  },
  colNum: { width: 30 },
  colDesc: { flex: 1 },
  colQty: { width: 50, textAlign: "right" },
  colPrice: { width: 70, textAlign: "right" },
  colTotal: { width: 80, textAlign: "right" },

  // Totals
  totalsBlock: {
    alignSelf: "flex-end",
    width: 220,
    marginBottom: 24,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  totalLabel: {
    fontSize: 9,
    color: GRAY,
  },
  totalValue: {
    fontSize: 9,
    fontWeight: 600,
  },
  totalDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 2,
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: DARK,
    borderRadius: 4,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "white",
  },
  grandTotalValue: {
    fontSize: 11,
    fontWeight: 700,
    color: "white",
  },

  // Notes
  notesBox: {
    backgroundColor: LIGHT,
    borderRadius: 6,
    padding: 14,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: GREEN,
  },
  notesTitle: {
    fontSize: 8,
    fontWeight: 600,
    color: GRAY,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 9,
    color: DARK,
    lineHeight: 1.5,
  },

  // Payment info
  paymentBox: {
    flexDirection: "row",
    gap: 30,
    marginBottom: 20,
  },
  paymentCol: {
    flex: 1,
  },
  paymentLabel: {
    fontSize: 7,
    fontWeight: 600,
    color: GRAY,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  paymentValue: {
    fontSize: 9,
    color: DARK,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 7,
    color: GRAY,
  },
  footerPage: {
    fontSize: 8,
    color: GRAY,
    fontWeight: 600,
  },

  // Photo page
  photoHeader: {
    marginBottom: 20,
  },
  photoTitle: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 2,
  },
  photoSubtitle: {
    fontSize: 9,
    color: GRAY,
  },
  divider: {
    height: 2,
    backgroundColor: GREEN,
    marginBottom: 20,
  },
  photoGrid: {
    flexDirection: "row",
    gap: 14,
  },
  photoCol: {
    flex: 1,
  },
  photoLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: "white",
    paddingVertical: 6,
    textAlign: "center",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  beforeLabel: { backgroundColor: "#ea580c" },
  afterLabel: { backgroundColor: GREEN },
  photoPlaceholder: {
    height: 260,
    backgroundColor: LIGHT,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    borderTopWidth: 0,
  },
  photoImage: {
    width: "100%",
    height: 260,
    objectFit: "cover",
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  photoCaption: {
    fontSize: 8,
    color: GRAY,
    marginTop: 4,
    textAlign: "center",
  },
  photoNotes: {
    marginTop: 20,
    backgroundColor: LIGHT,
    borderRadius: 6,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: GREEN,
  },
});

export interface InvoiceReportData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  company: {
    name: string;
    address: string;
    postcode: string;
    phone: string;
    email: string;
    kvk: string;
    btw: string;
    iban: string;
  };
  client: {
    name: string;
    address: string;
    postcode: string;
  };
  worker: string;
  lineItems: {
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
  }[];
  notes: string;
  beforePhoto?: string;
  afterPhoto?: string;
  beforeTime?: string;
  afterTime?: string;
}

export function InvoiceReport({ data }: { data: InvoiceReportData }) {
  const subtotal = data.lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const btw = subtotal * 0.21;
  const total = subtotal + btw;

  const fmt = (n: number) =>
    n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Document>
      {/* PAGE 1: Factuur */}
      <Page size="A4" style={s.page}>
        <View style={s.topBar} />

        <View style={s.header}>
          <View>
            <Text style={s.companyName}>{data.company.name}</Text>
            <Text style={s.companyDetails}>
              {data.company.address}{"\n"}
              {data.company.postcode}{"\n"}
              {data.company.phone}{"\n"}
              {data.company.email}
            </Text>
          </View>
          <View>
            <Text style={s.invoiceTitle}>FACTUUR</Text>
            <Text style={s.invoiceNumber}>#{data.invoiceNumber}</Text>
          </View>
        </View>

        <View style={s.metaRow}>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Factuuradres</Text>
            <Text style={s.metaValue}>{data.client.name}</Text>
            <Text style={s.metaDetail}>{data.client.address}</Text>
            <Text style={s.metaDetail}>{data.client.postcode}</Text>
          </View>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Factuurdatum</Text>
            <Text style={s.metaValue}>{data.date}</Text>
            <Text style={s.metaDetail}>Vervaldatum: {data.dueDate}</Text>
          </View>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Uitgevoerd door</Text>
            <Text style={s.metaValue}>{data.worker}</Text>
            <Text style={s.metaDetail}>Zie bijlage: fotografisch verslag</Text>
          </View>
        </View>

        {/* Line items */}
        <View style={s.table}>
          <View style={s.tableHead}>
            <Text style={[s.tableHeadText, s.colNum]}>#</Text>
            <Text style={[s.tableHeadText, s.colDesc]}>Omschrijving</Text>
            <Text style={[s.tableHeadText, s.colQty]}>Aantal</Text>
            <Text style={[s.tableHeadText, s.colPrice]}>Prijs</Text>
            <Text style={[s.tableHeadText, s.colTotal]}>Totaal</Text>
          </View>
          {data.lineItems.map((item, i) => (
            <View
              key={i}
              style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
            >
              <Text style={[s.tableCell, s.colNum]}>{i + 1}</Text>
              <Text style={[s.tableCell, s.colDesc]}>{item.description}</Text>
              <Text style={[s.tableCell, s.colQty]}>
                {item.quantity} {item.unit}
              </Text>
              <Text style={[s.tableCell, s.colPrice]}>
                EUR {fmt(item.unitPrice)}
              </Text>
              <Text style={[s.tableCellBold, s.colTotal]}>
                EUR {fmt(item.quantity * item.unitPrice)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={s.totalsBlock}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Subtotaal</Text>
            <Text style={s.totalValue}>EUR {fmt(subtotal)}</Text>
          </View>
          <View style={s.totalDivider} />
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>BTW (21%)</Text>
            <Text style={s.totalValue}>EUR {fmt(btw)}</Text>
          </View>
          <View style={s.grandTotalRow}>
            <Text style={s.grandTotalLabel}>Totaal</Text>
            <Text style={s.grandTotalValue}>EUR {fmt(total)}</Text>
          </View>
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={s.notesBox}>
            <Text style={s.notesTitle}>Werkzaamheden</Text>
            <Text style={s.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* Payment info */}
        <View style={s.paymentBox}>
          <View style={s.paymentCol}>
            <Text style={s.paymentLabel}>Betaalgegevens</Text>
            <Text style={s.paymentValue}>IBAN: {data.company.iban}</Text>
            <Text style={s.paymentValue}>t.n.v. {data.company.name}</Text>
          </View>
          <View style={s.paymentCol}>
            <Text style={s.paymentLabel}>Bedrijfsgegevens</Text>
            <Text style={s.paymentValue}>KVK: {data.company.kvk}</Text>
            <Text style={s.paymentValue}>BTW: {data.company.btw}</Text>
          </View>
          <View style={s.paymentCol}>
            <Text style={s.paymentLabel}>Betalingstermijn</Text>
            <Text style={s.paymentValue}>14 dagen na factuurdatum</Text>
            <Text style={s.paymentValue}>Graag o.v.v. #{data.invoiceNumber}</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {data.company.name} | KVK {data.company.kvk} | BTW {data.company.btw}
          </Text>
          <Text style={s.footerPage}>Pagina 1 van 2</Text>
        </View>
      </Page>

      {/* PAGE 2: Foto's */}
      <Page size="A4" style={s.page}>
        <View style={s.topBar} />

        <View style={s.photoHeader}>
          <Text style={s.photoTitle}>Fotografisch verslag</Text>
          <Text style={s.photoSubtitle}>
            {data.client.name} | {data.client.address} | {data.date}
          </Text>
        </View>

        <View style={s.divider} />

        <View style={s.photoGrid}>
          <View style={s.photoCol}>
            <Text style={[s.photoLabel, s.beforeLabel]}>VOOR</Text>
            {data.beforePhoto ? (
              <Image src={data.beforePhoto} style={s.photoImage} />
            ) : (
              <View style={s.photoPlaceholder}>
                <Text style={{ color: GRAY, fontSize: 10 }}>Voor-foto</Text>
              </View>
            )}
            <Text style={s.photoCaption}>
              {data.beforeTime ? `Genomen om ${data.beforeTime}` : ""}
            </Text>
          </View>
          <View style={s.photoCol}>
            <Text style={[s.photoLabel, s.afterLabel]}>NA</Text>
            {data.afterPhoto ? (
              <Image src={data.afterPhoto} style={s.photoImage} />
            ) : (
              <View style={s.photoPlaceholder}>
                <Text style={{ color: GRAY, fontSize: 10 }}>Na-foto</Text>
              </View>
            )}
            <Text style={s.photoCaption}>
              {data.afterTime ? `Genomen om ${data.afterTime}` : ""}
            </Text>
          </View>
        </View>

        {data.notes && (
          <View style={s.photoNotes}>
            <Text style={s.notesTitle}>Opmerkingen medewerker</Text>
            <Text style={s.notesText}>{data.notes}</Text>
          </View>
        )}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Bijlage bij factuur #{data.invoiceNumber}
          </Text>
          <Text style={s.footerPage}>Pagina 2 van 2</Text>
        </View>
      </Page>
    </Document>
  );
}
