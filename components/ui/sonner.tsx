"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      closeButton
      toastOptions={{
        style: {
          width: "fit-content",
          minWidth: "0",
        },
        classNames: {
          toast:
            "group toast relative !w-fit !min-w-0 max-w-[calc(100vw-2rem)] pr-9 group-[.toaster]:border-zinc-200 group-[.toaster]:bg-white group-[.toaster]:text-zinc-900 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-zinc-600",
          actionButton:
            "group-[.toast]:bg-zinc-900 group-[.toast]:text-zinc-50",
          cancelButton:
            "group-[.toast]:bg-zinc-100 group-[.toast]:text-zinc-500",
          closeButton:
            "group-[.toast]:absolute group-[.toast]:right-2 group-[.toast]:top-1/2 group-[.toast]:-translate-y-1/2 group-[.toast]:border-zinc-200 group-[.toast]:bg-white group-[.toast]:text-zinc-500 group-[.toast]:hover:bg-zinc-100",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
