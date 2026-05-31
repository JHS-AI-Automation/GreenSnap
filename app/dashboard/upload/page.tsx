"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { DEMO_TENANT_ID } from "@/lib/constants";

const DEMO_OWNER = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

const DEMO_JOBS = [
  { id: "aaa11111-1111-1111-1111-111111111111", label: "Fam. Smit - Brinkstraat 15" },
  { id: "bbb22222-2222-2222-2222-222222222222", label: "Kantoor De Brinck - Marktstraat 8" },
  { id: "ccc33333-3333-3333-3333-333333333333", label: "Fam. De Groot - Deldenerstraat 42" },
];

export default function UploadPage() {
  const [selectedJob, setSelectedJob] = useState("");
  const [photoType, setPhotoType] = useState<"before" | "after">("before");
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setResult(null);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(selected);
  };

  const handleUpload = async () => {
    if (!file || !selectedJob) return;
    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("jobId", selectedJob);
    formData.append("tenantId", DEMO_TENANT_ID);
    formData.append("userId", DEMO_OWNER);
    formData.append("type", photoType);
    if (caption) formData.append("caption", caption);

    try {
      const res = await fetch("/api/photos/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        setResult({ success: true, message: `${photoType === "before" ? "Voor" : "Na"}-foto geupload voor ${DEMO_JOBS.find(j => j.id === selectedJob)?.label}` });
        setFile(null);
        setPreview(null);
        setCaption("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        setResult({ success: false, message: data.error || "Upload mislukt" });
      }
    } catch {
      setResult({ success: false, message: "Netwerkfout" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition">
          &larr; Terug
        </Link>
        <h1 className="text-2xl font-bold">Foto uploaden</h1>
      </div>

      {/* Job selectie */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Opdracht</label>
          <select
            value={selectedJob}
            onChange={(e) => setSelectedJob(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg text-sm bg-white"
          >
            <option value="">Kies een opdracht...</option>
            {DEMO_JOBS.map((job) => (
              <option key={job.id} value={job.id}>{job.label}</option>
            ))}
          </select>
        </div>

        {/* Type selectie */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Type foto</label>
          <div className="flex gap-3">
            <button
              onClick={() => setPhotoType("before")}
              className={`flex-1 py-3 rounded-lg font-medium text-sm transition ${
                photoType === "before"
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Voor-foto
            </button>
            <button
              onClick={() => setPhotoType("after")}
              className={`flex-1 py-3 rounded-lg font-medium text-sm transition ${
                photoType === "after"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Na-foto
            </button>
          </div>
        </div>

        {/* Foto selectie */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Foto</label>
          {!preview ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-12 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-400 hover:bg-green-50 transition flex flex-col items-center gap-2"
            >
              <span className="text-3xl">📁</span>
              <span className="text-sm text-gray-500">Klik om een foto te kiezen</span>
            </button>
          ) : (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Preview"
                className="w-full max-h-[300px] object-cover rounded-xl"
              />
              <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-sm font-medium text-white ${
                photoType === "before" ? "bg-orange-500" : "bg-green-600"
              }`}>
                {photoType === "before" ? "VOOR" : "NA"}
              </span>
              <button
                onClick={() => {
                  setPreview(null);
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="absolute top-3 right-3 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition text-sm"
              >
                X
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Opmerking */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Opmerking (optioneel)</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Bijv. 'heg gesnoeid aan de voorzijde'"
            className="w-full p-3 border border-gray-200 rounded-lg resize-none h-20 text-sm"
          />
        </div>

        {/* Upload knop */}
        <button
          onClick={handleUpload}
          disabled={!file || !selectedJob || uploading}
          className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? "Uploaden..." : "Upload foto"}
        </button>

        {/* Resultaat */}
        {result && (
          <div className={`p-4 rounded-lg text-sm ${
            result.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}>
            {result.success ? "✅" : "❌"} {result.message}
          </div>
        )}
      </div>
    </div>
  );
}
