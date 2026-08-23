/**
 * Shared sidebar / mobile drawer navigation groups.
 */
import {
  LightBulbIcon,
  HomeIcon,
  ShoppingBagIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  Squares2X2Icon,
  ShieldCheckIcon,
  BuildingOffice2Icon,
  BanknotesIcon,
  DocumentPlusIcon,
  UserGroupIcon,
  ArrowUturnLeftIcon,
  CubeIcon,
  ShoppingCartIcon,
} from "@heroicons/react/24/outline";

export const getDashboardHref = (role) => {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "pharmacist":
      return "/branch/dashboard";
    case "cashier":
      return "/cashier/dashboard";
    case "auditor":
      return "/reports";
    case "customer":
      return "/customer/dashboard";
    default:
      return "/account";
  }
};

export const getNavGroups = (user) => {
  const mainLinks = [];

  if (user) {
    mainLinks.push(
      { to: getDashboardHref(user.role), label: "Dashboard", icon: Squares2X2Icon },
      { to: "/products", label: "Catalogue", icon: ShoppingBagIcon },
    );
  } else {
    mainLinks.push({ to: "/", label: "Home", icon: HomeIcon });
  }

  const operationsLinks = [];
  const adminLinks = [];

  if (user?.role === "admin") {
    operationsLinks.push(
      { to: "/inventory/management", label: "Inventory Management", icon: ClipboardDocumentListIcon },
      { to: "/inventory/control", label: "Manage Products", icon: CubeIcon },
      { to: "/restocks", label: "Restocks", icon: ShoppingCartIcon },
      { to: "/supplier-intelligence", label: "Supplier Intel", icon: LightBulbIcon },
      { to: "/otc-sales", label: "OTC Sales", icon: ShoppingBagIcon },
      { to: "/customers", label: "Customers", icon: UserGroupIcon },
      { to: "/purchase-orders", label: "Purchases", icon: DocumentPlusIcon },
      { to: "/reports", label: "Reports", icon: ChartBarIcon },
      { to: "/quotations", label: "Quotations", icon: DocumentPlusIcon },
      { to: "/stock-adjustments", label: "Stock Adjustments", icon: ArrowUturnLeftIcon },
      { to: "/clinical", label: "Clinical", icon: UserGroupIcon },
      { to: "/compliance", label: "Compliance", icon: ShieldCheckIcon },
    );
    adminLinks.push(
      { to: "/admin/branches", label: "Branches", icon: BuildingOffice2Icon },
      { to: "/admin/users", label: "Users", icon: ShieldCheckIcon },
    );
  } else if (user?.role === "pharmacist") {
    operationsLinks.push(
      { to: "/inventory/management", label: "Inventory Management", icon: ClipboardDocumentListIcon },
      { to: "/inventory/control", label: "Manage Products", icon: CubeIcon },
      { to: "/supplier-intelligence", label: "Supplier Intel", icon: LightBulbIcon },
      { to: "/otc-sales", label: "OTC Sales", icon: ShoppingBagIcon },
      { to: "/reports", label: "Reports", icon: ChartBarIcon },
      { to: "/quotations", label: "Quotations", icon: DocumentPlusIcon },
      { to: "/stock-adjustments", label: "Stock Adjustments", icon: ArrowUturnLeftIcon },
      { to: "/clinical", label: "Clinical", icon: UserGroupIcon },
      { to: "/compliance", label: "Compliance", icon: ShieldCheckIcon },
    );
  } else if (user?.role === "cashier") {
    operationsLinks.push(
      { to: "/otc-sales", label: "OTC Sales", icon: ShoppingBagIcon },
      { to: "/customers", label: "Customers", icon: UserGroupIcon },
    );
  } else if (user?.role === "auditor") {
    operationsLinks.push(
      { to: "/inventory/management", label: "Inventory Management", icon: ClipboardDocumentListIcon },
      { to: "/supplier-intelligence", label: "Supplier Intel", icon: LightBulbIcon },
      { to: "/reports", label: "Reports", icon: ChartBarIcon },
      { to: "/quotations", label: "Quotations", icon: DocumentPlusIcon },
    );
  }

  if (user?.can_view_financials || user?.role === "admin" || user?.role === "auditor") {
    operationsLinks.push({ to: "/financials", label: "Financials", icon: BanknotesIcon });
  }

  return { mainLinks, operationsLinks, adminLinks };
};
