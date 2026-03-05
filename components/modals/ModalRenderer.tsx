"use client";

import { CreateCategoryModal } from "@/components/modals/CreateCategoryModal";
import { DeactivateCategoryModal } from "@/components/modals/DeactivateCategoryModal";
import { DeleteCategoryModal } from "@/components/modals/DeleteCategoryModal";
import { CreateStatusModal } from "@/components/modals/CreateStatusModal";
import { DeactivateStatusModal } from "@/components/modals/DeactivateStatusModal";
import { DeleteStatusModal } from "@/components/modals/DeleteStatusModal";
import type { ActiveModal } from "@/lib/useModal";

type ModalRendererProps = {
  activeModal: ActiveModal | null;
  onClose: () => void;
};

export function ModalRenderer({ activeModal, onClose }: ModalRendererProps) {
  if (!activeModal) {
    return null;
  }

  switch (activeModal.type) {
    case "createCategory":
      return <CreateCategoryModal open onClose={onClose} {...activeModal.props} />;
    case "deactivateCategory":
      return <DeactivateCategoryModal open onClose={onClose} {...activeModal.props} />;
    case "deleteCategory":
      return <DeleteCategoryModal open onClose={onClose} {...activeModal.props} />;
    case "createStatus":
      return <CreateStatusModal open onClose={onClose} {...activeModal.props} />;
    case "deactivateStatus":
      return <DeactivateStatusModal open onClose={onClose} {...activeModal.props} />;
    case "deleteStatus":
      return <DeleteStatusModal open onClose={onClose} {...activeModal.props} />;
    default:
      return null;
  }
}
