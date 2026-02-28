"use client";

import { CreateCategoryModal } from "@/components/modals/CreateCategoryModal";
import type { ModalRegistry } from "@/lib/useModal";

type ModalRendererProps = {
  modalType: keyof ModalRegistry | null;
  modalProps: ModalRegistry[keyof ModalRegistry] | null;
  onClose: () => void;
};

export function ModalRenderer({ modalType, modalProps, onClose }: ModalRendererProps) {
  if (!modalType || !modalProps) {
    return null;
  }

  switch (modalType) {
    case "createCategory":
      return <CreateCategoryModal open onClose={onClose} {...modalProps} />;
    default:
      return null;
  }
}
