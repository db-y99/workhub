"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";

interface ResourceNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceName: string;
  notes: string;
}

export function ResourceNotesModal({
  isOpen,
  onClose,
  resourceName,
  notes,
}: ResourceNotesModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      scrollBehavior="inside"
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <span className="text-default-500 text-sm font-normal">
                Ghi chú — {resourceName}
              </span>
            </ModalHeader>
            <ModalBody>
              <p className="text-default-700 whitespace-pre-wrap">{notes}</p>
            </ModalBody>
            <ModalFooter>
              <Button color="primary" variant="light" onPress={onClose}>
                Đóng
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
