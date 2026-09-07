"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { REQUEST_STATUS_CONFIRM } from "@/constants/requests";

export type TConfirmableRequestStatus = keyof typeof REQUEST_STATUS_CONFIRM;

type TRequestStatusConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  status: TConfirmableRequestStatus | null;
  requestTitle: string;
  isPending: boolean;
};

export function RequestStatusConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  status,
  requestTitle,
  isPending,
}: TRequestStatusConfirmModalProps) {
  if (!status) return null;

  const config = REQUEST_STATUS_CONFIRM[status];

  return (
    <Modal
      classNames={{ wrapper: "z-[60]" }}
      isDismissable={!isPending}
      isKeyboardDismissDisabled={isPending}
      isOpen={isOpen}
      size="sm"
      onClose={onClose}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <h2 className="text-xl font-bold">{config.title}</h2>
            </ModalHeader>
            <ModalBody>
              <p className="text-default-600">
                Bạn có chắc chắn muốn {config.actionLabel} yêu cầu
                {requestTitle ? (
                  <>
                    {" "}
                    <span className="font-semibold">{requestTitle}</span>
                  </>
                ) : (
                  " này"
                )}
                ?
              </p>
            </ModalBody>
            <ModalFooter>
              <Button
                color="default"
                isDisabled={isPending}
                variant="light"
                onPress={onClose}
              >
                Hủy
              </Button>
              <Button
                color={config.confirmColor}
                isLoading={isPending}
                onPress={onConfirm}
              >
                {config.confirmLabel}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
