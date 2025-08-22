"use client";
import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  ShoppingBag, 
  Package, 
  FileText, 
  BarChart3, 
  Settings,
  LogOut
} from "lucide-react";


const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { id: "sales", label: "Sales", icon: ShoppingCart, path: "/sales" },
  { id: "purchase", label: "Purchase", icon: ShoppingBag, path: "/purchase" },
  { id: "stock", label: "Stock", icon: Package, path: "/stock" },
  { id: "ledger", label: "Ledger", icon: FileText, path: "/ledger" },
  { id: "reports", label: "Reports", icon: BarChart3, path: "/reports" },
  { id: "customer", label: "Customer", icon: BarChart3, path: "/customer" },
  { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    // Example: remove token
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <div className="bg-white border-r border-gray-200 w-64 min-h-screen flex flex-col">
      {/* Logo + Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="bg-blue-600 w-10 h-10 rounded-xl flex items-center justify-center mb-3">
          <LayoutDashboard className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Bill Maker</h1>
        <p className="text-sm text-gray-600">Business Management</p>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.path);
            return (
              <li key={item.id}>
                <button
                  onClick={() => router.push(item.path)}
                  className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-600 border border-blue-200"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-4 py-3 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </button>
      </div>
    </div>
  );
}
