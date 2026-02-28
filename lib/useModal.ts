"use client";

import { createContext, useContext } from "react";

export type TicketCategoryRow = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  color: string | null;
  sort_order: number;
  created_at: string;
};

export type ModalRegistry = {
  createCategory: {
    defaultName?: string;
    defaultDescription?: string;
    defaultSortOrder?: number;
    defaultColor?: string;
    onCreated?: (category: TicketCategoryRow) => void;
  };
};

type ActiveModal = {
  [K in keyof ModalRegistry]: {
    type: K;
    props: ModalRegistry[K];
  }
}[keyof ModalRegistry];

type ModalContextValue = {
  activeModal: ActiveModal | null;
  openModal: <T extends keyof ModalRegistry>(type: T, props: ModalRegistry[T]) => void;
  closeModal: () => void;
};

export const ModalContext = createContext<ModalContextValue | null>(null);

export function useModal() {
  const context = useContext(ModalContext);

  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }

  return context;
}
