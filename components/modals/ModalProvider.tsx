"use client";

import { useMemo, useState } from "react";

import { ModalRenderer } from "@/components/modals/ModalRenderer";
import { ModalContext, type ModalRegistry } from "@/lib/useModal";

type ActiveModal = {
  [K in keyof ModalRegistry]: {
    type: K;
    props: ModalRegistry[K];
  }
}[keyof ModalRegistry];

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
      <ModalRenderer modalType={activeModal?.type ?? null} modalProps={activeModal?.props ?? null} onClose={value.closeModal} />
    </ModalContext.Provider>
  );
}
