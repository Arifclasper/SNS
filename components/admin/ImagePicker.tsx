"use client";

import { useRef, useState } from "react";
import { IMAGE_ACCEPT, uploadImageFile } from "@/lib/upload-image";

export function ImagePicker({
  id,
  label = "Picture",
  value,
  onChange,
  hint,
  compact = false,
  disabled = false,
}: {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  compact?: boolean;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setError("");
    setUploading(true);
    try {
      const result = await uploadImageFile(file);
      onChange(result.url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const isUploaded = value.startsWith("/api/media/");

  return (
    <div>
      <label htmlFor={id} className={compact ? "sr-only" : "label"}>
        {label}
      </label>

      <div className="flex gap-2">
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`input ${compact ? "text-[12px]" : "text-[13px]"}`}
          placeholder={compact ? "Picture URL" : "https://… or upload a picture"}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || disabled}
          className="btn btn-secondary btn-sm shrink-0"
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => {
              setError("");
              onChange("");
            }}
            disabled={disabled}
            className="btn btn-ghost btn-sm shrink-0 text-danger"
            aria-label={`Remove ${label.toLowerCase()}`}
          >
            ×
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />

      {(hint || error || isUploaded || uploading) && (
        <div className="mt-1 space-y-0.5">
          {error ? (
            <p className="text-[11px] leading-relaxed text-danger">{error}</p>
          ) : uploading ? (
            <p className="text-[11px] leading-relaxed text-muted">Uploading your picture…</p>
          ) : isUploaded ? (
            <p className="text-[11px] leading-relaxed text-muted">
              Uploaded picture · stored in the store database
            </p>
          ) : hint ? (
            <p className="text-[11px] leading-relaxed text-muted">{hint}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
