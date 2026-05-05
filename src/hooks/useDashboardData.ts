import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardOrder {
  id: string;
  customer_name: string;
  total: number;
  status: string;
  created_at: string;
}

interface InventoryAlert {
  name: string;
  stock: number;
  product_type: string;
}

interface DashboardData {
  totalRevenue: number;
  totalOrders: number;
  activeCustomers: number;
  recentOrders: DashboardOrder[];
  inventoryAlerts: InventoryAlert[];
  loading: boolean;
}

export const useDashboardData = (): DashboardData => {
  const [data, setData] = useState<DashboardData>({
    totalRevenue: 0,
    totalOrders: 0,
    activeCustomers: 0,
    recentOrders: [],
    inventoryAlerts: [],
    loading: true,
  });

  useEffect(() => {
    const fetchData = async () => {
      // Fetch recent orders
      const { data: ordersData } = await supabase
        .from("orders")
        .select("id, total_price, customer_phone, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      const orders = ordersData ?? [];

      // Fetch all orders for count
      const { data: allOrdersData } = await supabase
        .from("orders")
        .select("id, total_price");

      const allOrders = allOrdersData ?? [];

      const totalRevenue = allOrders.reduce((sum, o) => sum + Number(o.total_price || 0), 0);

      // Fetch low stock items from catalogue
      const { data: lowStockData } = await supabase
        .from("hive_catalogue")
        .select("product_name, stock_count, item_type")
        .lte("stock_count", 5)
        .order("stock_count", { ascending: true })
        .limit(5);

      const lowStock = lowStockData ?? [];

      setData({
        totalRevenue,
        totalOrders: allOrders.length,
        activeCustomers: orders.length > 0 ? orders.filter((o: any) => o.customer_phone).length : 0,
        recentOrders: orders.map((o: any) => ({
          id: o.id || "N/A",
          customer_name: o.customer_phone || "Customer",
          total: Number(o.total_price || 0),
          status: o.status || "Pending",
          created_at: o.created_at,
        })),
        inventoryAlerts: lowStock.map((p: any) => ({
          name: p.product_name || "Unknown",
          stock: p.stock_count || 0,
          product_type: p.item_type || "Product",
        })),
        loading: false,
      });
    };
    fetchData();
  }, []);

  return data;
};
