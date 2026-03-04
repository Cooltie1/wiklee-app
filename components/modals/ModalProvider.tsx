"use client";

import { useMemo, useState } from "react";

import { ModalRenderer } from "@/components/modals/ModalRenderer";
import { ModalContext, type ActiveModal, type ModalRegistry } from "@/lib/useModal";

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);

  const value = useMemo(
    () => ({
      activeModal,
      openModal: <T extends keyof ModalRegistry>(type: T, props: ModalRegistry[T]) => {
        setActiveModal({ type, props } as ActiveModal);
      },
      closeModal: () => {
        setActiveModal(null);
      },
    }),
    [activeModal]
  );

  return (
    <ModalContext.Provider value={value}>
      {children}
      <ModalRenderer activeModal={activeModal} onClose={value.closeModal} />
    </ModalContext.Provider>
  );
}
