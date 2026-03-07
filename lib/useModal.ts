"use client";

import { createContext, useContext } from "react";

export type TicketCategoryRow = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type TicketStatusRow = {
  id: string;
  org_id: string | null;
  label: string;
  description: string | null;
  color: "green" | "amber" | "red" | "zinc" | "blue" | "purple";
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type TicketPriorityRow = {
  id: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type ModalRegistry = {
  createCategory: {
    categoryId?: string;
    defaultName?: string;
    defaultDescription?: string;
    onCreated?: (category: TicketCategoryRow) => void;
    onUpdated?: (category: TicketCategoryRow) => void;
  };
  deactivateCategory: {
    categoryId: string;
    categoryName: string;
    onDeactivated?: (categoryId: string) => void;
  };
  deleteCategory: {
    categoryId: string;
    categoryName: string;
    onDeleted?: (categoryId: string) => void;
  };
  createStatus: {
    statusId?: string;
    defaultLabel?: string;
    defaultDescription?: string;
    defaultColor?: TicketStatusRow["color"];
    onCreated?: (status: TicketStatusRow) => void;
    onUpdated?: (status: TicketStatusRow) => void;
  };
  deactivateStatus: {
    statusId: string;
    statusLabel: string;
    onDeactivated?: (statusId: string) => void;
  };
  deleteStatus: {
    statusId: string;
    statusLabel: string;
    onDeleted?: (statusId: string) => void;
  };
  createPriority: {
    priorityId?: string;
    defaultLabel?: string;
    onCreated?: (priority: TicketPriorityRow) => void;
    onUpdated?: (priority: TicketPriorityRow) => void;
  };
  deactivatePriority: {
    priorityId: string;
    priorityLabel: string;
    onDeactivated?: (priorityId: string) => void;
  };
  deletePriority: {
    priorityId: string;
    priorityLabel: string;
    onDeleted?: (priorityId: string) => void;
  };
};

export type ActiveModal = {
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
