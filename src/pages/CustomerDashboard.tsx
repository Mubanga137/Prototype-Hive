import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import HoneycombBackground from "@/components/HoneycombBackground";
import { useAuth } from "@/hooks/useAuth";
import CustomerDashboardSidebar from "@/components/CustomerDashboardSidebar";
import DashboardHomeSection from "@/components/DashboardHomeSection";

// Subpages
import Marketplace from "@/pages/customer/Marketplace";
import OrderHistory from "@/pages/customer/OrderHistory";
import TrackOrders from "@/pages/customer/TrackOrders";
import CustomerWallet from "@/pages/customer/CustomerWallet";
import Categories from "@/pages/customer/Categories";
import CustomerSettings from "@/pages/customer/CustomerSettings";
import Messages from "@/pages/customer/Messages";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
};

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState("Home");

  const greeting = useMemo(() => getGreeting(), []);
  const firstName = user?.email?.split("@")[0] || profile?.full_name?.split(" ")[0] || "Guest";

  const renderContent = () => {
    switch (activeSection) {
      case "Marketplace": return <Marketplace />;
      case "Order History": return <OrderHistory />;
      case "Track My Orders": return <TrackOrders />;
      case "Wallet": return <CustomerWallet />;
      case "Categories": return <Categories />;
      case "Messages": return <Messages />;
      case "Settings": return <CustomerSettings />;
      default: return <DashboardHomeSection firstName={firstName} greeting={greeting} setActiveSection={setActiveSection} />;
    }
  };

  return (
    <div className="min-h-screen relative">
      <HoneycombBackground />
      <CustomerDashboardSidebar activeSection={activeSection} onSectionChange={setActiveSection}>
        {renderContent()}
      </CustomerDashboardSidebar>
    </div>
  );
};

export default CustomerDashboard;
