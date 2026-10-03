"use client";

import React from "react";

export default function Toast({ message, type = "info", onClose }) {
  if (!message) return null;

  const isError = type === "error";
  const isSuccess = type === "success";

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed top-4 right-4 z-50 max-w-sm px-4 py-3 rounded-[4px] border text-xs font-mono shadow-sm transition-all duration-200 flex items-start gap-2.5 ${
        isError
          ? "bg-[#FFFFFF] text-[#D92D20] border-[#D92D20]"
          : isSuccess
          ? "bg-[#111111] text-[#FFFFFF] border-[#111111]"
          : "bg-[#FFFFFF] text-[#111111] border-[#E5E7EB]"
      }`}
    >
      <div className="mt-0.5 shrink-0">
        {isSuccess ? (
          <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        ) : isError ? (
          <svg className="w-3.5 h-3.5 text-[#D92D20]" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <div className="w-2 h-2 rounded-full bg-[#111111] mt-1" />
        )}
      </div>

      <div className="flex-1 leading-relaxed break-words">{message}</div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup notifikasi"
          className={`shrink-0 p-0.5 rounded transition-opacity ${
            isSuccess
              ? "text-white/70 hover:text-white"
              : isError
              ? "text-[#D92D20]/70 hover:text-[#D92D20]"
              : "text-[#6B7280] hover:text-[#111111]"
          }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
