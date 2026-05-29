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
const LIGHT_GRAY = "#f3f4f6";
const BORDER = "#e5e7eb";

const s = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 10,
    color: DARK,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 50,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 30,
  },
  logoBlock: {
    flexDirection: "column",
  },
  logoText: {
    fontSize: 22,
    fontWeight: 700,
    color: GREEN,
    letterSpacing: -0.5,
  },
  logoSubtext: {
    fontSize: 8,
    color: GRAY,
    marginTop: 2,
  },
  reportLabel: {
    backgroundColor: GREEN,
    color: "white",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
  },

  // Divider
  divider: {
    height: 2,
    backgroundColor: GREEN,
    marginBottom: 24,
  },
  thinDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 16,
  },

  // Info grid
  infoGrid: {
    flexDirection: "row",
    marginBottom: 24,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 8,
    color: GRAY,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 11,
    fontWeight: 600,
    marginBottom: 2,
  },
  infoDetail: {
    fontSize: 9,
    color: GRAY,
  },

  // Table
  table: {
    marginTop: 8,
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: DARK,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderText: {
    color: "white",
    fontSize: 8,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableRowAlt: {
    backgroundColor: LIGHT_GRAY,
  },
  tableCell: {
    fontSize: 10,
  },
  colDesc: { flex: 3 },
  colStatus: { flex: 1 },
  colTime: { flex: 1 },
  colWorker: { flex: 1.5 },

  // Summary box
  summaryBox: {
    backgroundColor: LIGHT_GRAY,
    borderRadius: 6,
    padding: 16,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: 600,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 10,
    color: GRAY,
    lineHeight: 1.5,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 10,
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

  // Page 2: Photos
  photoTitle: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 4,
  },
  photoSubtitle: {
    fontSize: 10,
    color: GRAY,
    marginBottom: 20,
  },
  photoGrid: {
    flexDirection: "row",
    gap: 16,
  },
  photoCol: {
    flex: 1,
  },
  photoLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: "white",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    textAlign: "center",
  },
  beforeLabel: {
    backgroundColor: "#ea580c",
  },
  afterLabel: {
    backgroundColor: GREEN,
  },
  photoPlaceholder: {
    height: 280,
    backgroundColor: LIGHT_GRAY,
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
    height: 280,
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
  notesSection: {
    marginTop: 24,
    backgroundColor: LIGHT_GRAY,
    borderRadius: 6,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: GREEN,
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: 600,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 10,
    color: DARK,
    lineHeight: 1.6,
  },
  stampRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  stampBox: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    padding: 12,
    width: "45%",
    alignItems: "center",
  },
  stampLabel: {
    fontSize: 8,
    color: GRAY,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  stampValue: {
    fontSize: 10,
    fontWeight: 600,
  },
});

export interface ReportData {
  reportNumber: string;
  date: string;
  company: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  client: {
    name: string;
    address: string;
  };
  worker: string;
  jobDescription: string;
  notes: string;
  beforePhoto?: string;
  afterPhoto?: string;
  beforeTime?: string;
  afterTime?: string;
}

export function GreenSnapReport({ data }: { data: ReportData }) {
  return (
    <Document>
      {/* PAGE 1: Invoice-style overview */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.logoBlock}>
            <Text style={s.logoText}>JHS AUTOMATION</Text>
            <Text style={s.logoSubtext}>AI-Powered Rapportage</Text>
          </View>
          <Text style={s.reportLabel}>ONDERHOUDSRAPPORT</Text>
        </View>

        <View style={s.divider} />

        <View style={s.infoGrid}>
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>Rapport</Text>
            <Text style={s.infoValue}>#{data.reportNumber}</Text>
            <Text style={s.infoDetail}>Datum: {data.date}</Text>
          </View>
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>Uitgevoerd door</Text>
            <Text style={s.infoValue}>{data.company.name}</Text>
            <Text style={s.infoDetail}>{data.company.address}</Text>
            <Text style={s.infoDetail}>{data.company.phone}</Text>
          </View>
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>Klant</Text>
            <Text style={s.infoValue}>{data.client.name}</Text>
            <Text style={s.infoDetail}>{data.client.address}</Text>
          </View>
        </View>

        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderText, s.colDesc]}>Omschrijving</Text>
            <Text style={[s.tableHeaderText, s.colStatus]}>Status</Text>
            <Text style={[s.tableHeaderText, s.colTime]}>Tijd</Text>
            <Text style={[s.tableHeaderText, s.colWorker]}>Medewerker</Text>
          </View>
          <View style={s.tableRow}>
            <Text style={[s.tableCell, s.colDesc]}>
              {data.jobDescription}
            </Text>
            <Text style={[s.tableCell, s.colStatus]}>Afgerond</Text>
            <Text style={[s.tableCell, s.colTime]}>
              {data.beforeTime && data.afterTime
                ? `${data.beforeTime} - ${data.afterTime}`
                : "-"}
            </Text>
            <Text style={[s.tableCell, s.colWorker]}>{data.worker}</Text>
          </View>
          <View style={[s.tableRow, s.tableRowAlt]}>
            <Text style={[s.tableCell, s.colDesc]}>
              Fotografische documentatie (voor/na)
            </Text>
            <Text style={[s.tableCell, s.colStatus]}>Bijgevoegd</Text>
            <Text style={[s.tableCell, s.colTime]}>Zie pagina 2</Text>
            <Text style={[s.tableCell, s.colWorker]}>{data.worker}</Text>
          </View>
        </View>

        <View style={s.summaryBox}>
          <Text style={s.summaryTitle}>Samenvatting werkzaamheden</Text>
          <Text style={s.summaryText}>{data.notes}</Text>
        </View>

        <View style={s.stampRow}>
          <View style={s.stampBox}>
            <Text style={s.stampLabel}>Rapportnummer</Text>
            <Text style={s.stampValue}>#{data.reportNumber}</Text>
          </View>
          <View style={s.stampBox}>
            <Text style={s.stampLabel}>Datum afronding</Text>
            <Text style={s.stampValue}>{data.date}</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {data.company.name} | {data.company.phone} | {data.company.email}
          </Text>
          <Text style={s.footerPage}>Pagina 1 van 2</Text>
        </View>
      </Page>

      {/* PAGE 2: Before/After photos */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.photoTitle}>Fotografisch verslag</Text>
            <Text style={s.photoSubtitle}>
              {data.client.name} | {data.client.address} | {data.date}
            </Text>
          </View>
        </View>

        <View style={s.divider} />

        <View style={s.photoGrid}>
          <View style={s.photoCol}>
            <Text style={[s.photoLabel, s.beforeLabel]}>VOOR</Text>
            {data.beforePhoto ? (
              <Image src={data.beforePhoto} style={s.photoImage} />
            ) : (
              <View style={s.photoPlaceholder}>
                <Text style={{ color: GRAY, fontSize: 10 }}>
                  Voor-foto
                </Text>
              </View>
            )}
            <Text style={s.photoCaption}>
              {data.beforeTime ? `Genomen om ${data.beforeTime}` : "Tijdstip onbekend"}
            </Text>
          </View>

          <View style={s.photoCol}>
            <Text style={[s.photoLabel, s.afterLabel]}>NA</Text>
            {data.afterPhoto ? (
              <Image src={data.afterPhoto} style={s.photoImage} />
            ) : (
              <View style={s.photoPlaceholder}>
                <Text style={{ color: GRAY, fontSize: 10 }}>
                  Na-foto
                </Text>
              </View>
            )}
            <Text style={s.photoCaption}>
              {data.afterTime ? `Genomen om ${data.afterTime}` : "Tijdstip onbekend"}
            </Text>
          </View>
        </View>

        {data.notes && (
          <View style={s.notesSection}>
            <Text style={s.notesTitle}>Opmerkingen medewerker</Text>
            <Text style={s.notesText}>{data.notes}</Text>
          </View>
        )}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Dit rapport is automatisch gegenereerd door JHS Automation
          </Text>
          <Text style={s.footerPage}>Pagina 2 van 2</Text>
        </View>
      </Page>
    </Document>
  );
}
