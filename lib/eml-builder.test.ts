import { describe, it, expect } from "vitest";
import { buildEml } from "./eml-builder";

const FIXED_DATE = new Date("2026-05-31T12:00:00Z");

describe("buildEml", () => {
  describe("without attachments", () => {
    it("returns text/plain message with correct headers", () => {
      const eml = buildEml({
        from: "jan@groenwerk.nl",
        to: "klant@example.nl",
        subject: "Test rapport",
        body: "Beste klant,\n\nBijgevoegd het rapport.",
        date: FIXED_DATE,
      });

      expect(eml).toContain("From: jan@groenwerk.nl");
      expect(eml).toContain("To: klant@example.nl");
      expect(eml).toContain("Subject: Test rapport");
      expect(eml).toContain("MIME-Version: 1.0");
      expect(eml).toContain("Content-Type: text/plain; charset=utf-8");
      expect(eml).toContain("Beste klant,");
    });

    it("uses CRLF line endings", () => {
      const eml = buildEml({
        from: "a@b.nl",
        to: "c@d.nl",
        subject: "Test",
        body: "Body",
        date: FIXED_DATE,
      });
      expect(eml).toContain("\r\n");
    });
  });

  describe("with attachments", () => {
    it("returns multipart/mixed with boundary", () => {
      const eml = buildEml({
        from: "jan@groenwerk.nl",
        to: "klant@example.nl",
        subject: "Rapport",
        body: "Hi",
        date: FIXED_DATE,
        attachments: [
          {
            filename: "rapport.pdf",
            contentType: "application/pdf",
            data: Buffer.from("fake-pdf-data"),
          },
        ],
      });

      expect(eml).toContain("Content-Type: multipart/mixed; boundary=");
      expect(eml).toContain("Content-Type: application/pdf");
      expect(eml).toContain('filename="rapport.pdf"');
      expect(eml).toContain("Content-Transfer-Encoding: base64");
    });

    it("base64-encodes binary attachment", () => {
      const eml = buildEml({
        from: "a@b.nl",
        to: "c@d.nl",
        subject: "Test",
        body: "Body",
        date: FIXED_DATE,
        attachments: [
          {
            filename: "test.bin",
            contentType: "application/octet-stream",
            data: Buffer.from([0x00, 0xff, 0x10]),
          },
        ],
      });

      // Buffer [0x00, 0xff, 0x10] base64 = "AP8Q"
      expect(eml).toContain("AP8Q");
    });

    it("breaks long base64 lines at 76 chars", () => {
      const longData = Buffer.alloc(200, 0x41); // 200 bytes "A" -> long base64
      const eml = buildEml({
        from: "a@b.nl",
        to: "c@d.nl",
        subject: "Test",
        body: "Body",
        date: FIXED_DATE,
        attachments: [
          {
            filename: "big.bin",
            contentType: "application/octet-stream",
            data: longData,
          },
        ],
      });

      // Extract base64 portion (na laatste empty line voor attachment)
      const lines = eml.split("\r\n");
      const dataLines = lines.filter(
        (l) => /^[A-Za-z0-9+/=]+$/.test(l) && l.length > 0
      );
      // Geen lijn mag > 76 chars zijn
      for (const line of dataLines) {
        expect(line.length).toBeLessThanOrEqual(76);
      }
    });

    it("generates unique boundary per call", () => {
      const opts = {
        from: "a@b.nl",
        to: "c@d.nl",
        subject: "Test",
        body: "Body",
        date: FIXED_DATE,
        attachments: [
          {
            filename: "x.pdf",
            contentType: "application/pdf",
            data: Buffer.from("x"),
          },
        ],
      };

      const eml1 = buildEml(opts);
      const eml2 = buildEml(opts);

      const boundary1 = eml1.match(/boundary="([^"]+)"/)?.[1];
      const boundary2 = eml2.match(/boundary="([^"]+)"/)?.[1];

      expect(boundary1).toBeTruthy();
      expect(boundary2).toBeTruthy();
      expect(boundary1).not.toBe(boundary2);
    });

    it("ends with closing boundary marker", () => {
      const eml = buildEml({
        from: "a@b.nl",
        to: "c@d.nl",
        subject: "Test",
        body: "Body",
        date: FIXED_DATE,
        attachments: [
          {
            filename: "x.pdf",
            contentType: "application/pdf",
            data: Buffer.from("x"),
          },
        ],
      });

      const boundary = eml.match(/boundary="([^"]+)"/)?.[1];
      expect(boundary).toBeTruthy();
      expect(eml).toContain(`--${boundary}--`);
    });
  });

  describe("subject encoding", () => {
    it("leaves ASCII subject unchanged", () => {
      const eml = buildEml({
        from: "a@b.nl",
        to: "c@d.nl",
        subject: "Simple Subject 123",
        body: "Body",
        date: FIXED_DATE,
      });
      expect(eml).toContain("Subject: Simple Subject 123");
    });

    it("base64-encodes UTF-8 subject", () => {
      const eml = buildEml({
        from: "a@b.nl",
        to: "c@d.nl",
        subject: "Café update voor é",
        body: "Body",
        date: FIXED_DATE,
      });
      expect(eml).toMatch(/Subject: =\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=/);
    });

    it("encodes emoji in subject", () => {
      const eml = buildEml({
        from: "a@b.nl",
        to: "c@d.nl",
        subject: "Rapport 🌿",
        body: "Body",
        date: FIXED_DATE,
      });
      expect(eml).toMatch(/Subject: =\?UTF-8\?B\?/);
    });
  });

  describe("date formatting", () => {
    it("uses fixed date when provided", () => {
      const eml = buildEml({
        from: "a@b.nl",
        to: "c@d.nl",
        subject: "Test",
        body: "Body",
        date: FIXED_DATE,
      });
      expect(eml).toMatch(/Date: .+2026/);
    });

    it("uses current date when not provided", () => {
      const eml = buildEml({
        from: "a@b.nl",
        to: "c@d.nl",
        subject: "Test",
        body: "Body",
      });
      expect(eml).toMatch(/Date: .+\d{4}/);
    });
  });
});
