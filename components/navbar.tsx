"use client";

import { useState, useEffect, useRef } from "react";
import { useDebounceValue } from "usehooks-ts";
import {
  Navbar as HeroUINavbar,
  NavbarContent,
  NavbarMenu,
  NavbarMenuToggle,
  NavbarBrand,
  NavbarItem,
  NavbarMenuItem,
} from "@heroui/navbar";
import { Link } from "@heroui/link";
import { Input } from "@heroui/input";
import { Kbd } from "@heroui/kbd";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  useDisclosure,
} from "@heroui/modal";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
} from "@heroui/dropdown";
import { Avatar } from "@heroui/avatar";
import { User } from "@heroui/user";
import { link as linkStyles } from "@heroui/theme";
import NextLink from "next/link";
import clsx from "clsx";
import { usePathname, useRouter } from "next/navigation";
import { SearchIcon, LogOut, Menu } from "lucide-react";

import { siteConfig } from "@/config/site";
import { ThemeSwitch } from "@/components/theme-switch";
import { Logo } from "@/components/icons";
import { useAuth } from "@/lib/contexts/auth-context";
import { signOut } from "@/lib/actions/auth";

export interface NavbarProps {
  /** Mở sidebar (drawer) trên mobile khi dùng dashboard layout */
  onOpenSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSidebar }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser: user, hasPermission } = useAuth();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounceValue(searchQuery, 300);
  const [isClosing, setIsClosing] = useState(false);
  const searchInputWrapperRef = useRef<HTMLDivElement>(null);
  const lastCloseTimeRef = useRef<number>(0);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Keyboard shortcut for search (Ctrl+K / Command+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open modal on Ctrl+K or Command+K
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        const timeSinceLastClose = Date.now() - lastCloseTimeRef.current;

        if (!isOpen && !isClosing && timeSinceLastClose >= 500) {
          e.preventDefault();
          onOpen();
        }
      }
      // Close modal on Escape
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        handleCloseModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpen, isOpen, isClosing]);

  // Prevent focus on search input after modal closes
  useEffect(() => {
    if (!isOpen && !isClosing) {
      const timer = setTimeout(() => {
        if (searchInputWrapperRef.current) {
          const input = searchInputWrapperRef.current.querySelector("input");

          if (input && document.activeElement === input) {
            input.blur();
          }
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [isOpen, isClosing]);

  const allNavItems = siteConfig.navMenuItems.filter((item) => {
    const perm = item.permissionCode ?? null;
    if (perm && !hasPermission(perm)) return false;
    return true;
  });

  // Filter navigation items based on user role and search query
  const filteredNavItems = allNavItems.filter((item) =>
    item.label.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  );

  const handleCloseModal = () => {
    setIsClosing(true);
    setSearchQuery("");
    lastCloseTimeRef.current = Date.now();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onClose();
    setTimeout(() => {
      setIsClosing(false);
    }, 300);
  };

  const handleNavigate = (href: string) => {
    router.push(href);
    handleCloseModal();
  };

  const handleSearchInputClick = (e?: React.MouseEvent | React.FocusEvent) => {
    const timeSinceLastClose = Date.now() - lastCloseTimeRef.current;

    if (timeSinceLastClose < 500) {
      e?.preventDefault();
      return;
    }

    e?.preventDefault();
    if (!isOpen && !isClosing) {
      onOpen();
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut();
  };

  const searchInput = (
    <div ref={searchInputWrapperRef}>
      <Input
        readOnly
        aria-label="Tìm kiếm"
        classNames={{
          inputWrapper: "bg-default-100",
          input: "text-sm",
        }}
        endContent={
          <Kbd className="hidden lg:inline-block" keys={["command"]}>
            K
          </Kbd>
        }
        isDisabled={isClosing}
        labelPlacement="outside"
        placeholder="Tìm kiếm yêu cầu..."
        startContent={
          <SearchIcon className="text-base text-default-400 pointer-events-none flex-shrink-0 w-4 h-4" />
        }
        type="search"
        onClick={(e) => {
          const timeSinceLastClose = Date.now() - lastCloseTimeRef.current;

          if (timeSinceLastClose < 500) {
            e.preventDefault();
            return;
          }
          if (!isOpen && !isClosing) {
            handleSearchInputClick(e);
          }
        }}
        onFocus={(e) => {
          const timeSinceLastClose = Date.now() - lastCloseTimeRef.current;

          if (isClosing || isOpen || timeSinceLastClose < 500) {
            e.preventDefault();
            e.target.blur();
            return;
          }
          handleSearchInputClick(e);
        }}
        onMouseDown={(e) => {
          const timeSinceLastClose = Date.now() - lastCloseTimeRef.current;

          if (isClosing || timeSinceLastClose < 500) {
            e.preventDefault();
          }
        }}
      />
    </div>
  );

  return (
    <HeroUINavbar
      className="border-b border-divider p"
      maxWidth="full"
      position="sticky"
    >
      <NavbarContent className="hidden sm:flex basis-1/5 sm:basis-full">
        <NavbarItem className="hidden lg:flex">{searchInput}</NavbarItem>
      </NavbarContent>

      <NavbarContent
        className="hidden sm:flex gap-4"
        justify="end"
      >
        <NavbarItem className="hidden sm:flex gap-2">
          <ThemeSwitch />
        </NavbarItem>

        {user && (
          <NavbarItem>
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <Avatar
                  isBordered
                  as="button"
                  className="transition-transform"
                  color="primary"
                  name={user.user_metadata?.full_name || user.email || "User"}
                  size="sm"
                  src={user.user_metadata?.avatar_url}
                />
              </DropdownTrigger>
              <DropdownMenu aria-label="User menu" variant="flat">
                <DropdownSection showDivider>
                  <DropdownItem
                    key="profile"
                    className="h-14 gap-2"
                    textValue="Profile"
                  >
                    <User
                      name={user.user_metadata?.full_name || "User"}
                      description={user.email}
                      classNames={{
                        name: "text-default-600 font-semibold",
                        description: "text-default-500",
                      }}
                      avatarProps={{
                        size: "sm",
                        src: user.user_metadata?.avatar_url,
                      }}
                    />
                  </DropdownItem>
                </DropdownSection>
                <DropdownItem
                  key="logout"
                  color="danger"
                  startContent={<LogOut size={18} />}
                  onPress={handleLogout}
                  className={isLoggingOut ? "opacity-50" : ""}
                >
                  {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </NavbarItem>
        )}
      </NavbarContent>

      <NavbarContent className="sm:hidden basis-1 pl-4" justify="end">
        <ThemeSwitch />
        {onOpenSidebar ? (
          <NavbarItem>
            <button
              type="button"
              className="p-2 rounded-lg hover:bg-default-100"
              onClick={onOpenSidebar}
              aria-label="Mở menu"
            >
              <Menu size={22} />
            </button>
          </NavbarItem>
        ) : (
          <NavbarMenuToggle />
        )}
      </NavbarContent>

      {!onOpenSidebar && (
        <NavbarMenu>
          {searchInput}
          {user && (
            <div className="mx-4 mt-4 mb-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-default-100">
                <Avatar
                  isBordered
                  color="primary"
                  name={user.user_metadata?.full_name || user.email || "User"}
                  size="md"
                  src={user.user_metadata?.avatar_url}
                />
                <div className="flex flex-col">
                  <p className="text-sm font-semibold">
                    {user.user_metadata?.full_name || "User"}
                  </p>
                  <p className="text-xs text-default-500">{user.email}</p>
                </div>
              </div>
            </div>
          )}
          <div className="mx-4 mt-2 flex flex-col gap-2">
            {siteConfig.navMenuItems.map((item, index) => (
              <NavbarMenuItem key={`${item.href}-${index}`}>
                <Link
                  color={pathname === item.href ? "primary" : "foreground"}
                  href={item.href}
                  size="lg"
                >
                  {item.label}
                </Link>
              </NavbarMenuItem>
            ))}
            {user && (
              <NavbarMenuItem>
                <button
                  className="w-full text-left text-danger font-medium flex items-center gap-2 py-2"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  <LogOut size={18} />
                  {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
                </button>
              </NavbarMenuItem>
            )}
          </div>
        </NavbarMenu>
      )}

      {/* Search Modal */}
      {isOpen && (
        <Modal
          hideCloseButton
          isDismissable
          isKeyboardDismissDisabled={false}
          isOpen={isOpen}
          placement="top"
          size="2xl"
          onClose={handleCloseModal}
        >
          <ModalContent>
            <ModalHeader className="flex flex-col gap-1 pb-2">
              <Input
                autoFocus
                classNames={{
                  inputWrapper: "bg-default-100",
                  input: "text-sm",
                }}
                placeholder="Tìm kiếm..."
                startContent={<SearchIcon size={18} />}
                value={searchQuery}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && filteredNavItems.length > 0) {
                    handleNavigate(filteredNavItems[0].href);
                  }
                }}
                onValueChange={setSearchQuery}
              />
            </ModalHeader>
            <ModalBody className="py-2">
              {filteredNavItems.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {filteredNavItems.map((item) => (
                    <button
                      key={item.href}
                      className={clsx(
                        "w-full text-left px-4 py-3 rounded-lg",
                        "hover:bg-default-100 transition-colors",
                        "flex items-center gap-2"
                      )}
                      onClick={() => handleNavigate(item.href)}
                    >
                      <span className="font-medium">{item.label}</span>
                      <span className="text-xs text-default-400">
                        {item.href}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-default-500">
                  Không tìm thấy kết quả
                </div>
              )}
            </ModalBody>
          </ModalContent>
        </Modal>
      )}
    </HeroUINavbar>
  );
};
