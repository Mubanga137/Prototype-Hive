import { Loader2 } from "lucide-react";

export interface OnlineToggleButtonProps {
  isOnline: boolean;
  isLoading: boolean;
  onClick: () => void;
  role?: string;
}

export const OnlineToggleButton = ({
  isOnline,
  isLoading,
  onClick,
  role = "gig_worker",
}: OnlineToggleButtonProps) => {
  const getRoleLabel = () => {
    switch (role) {
      case "rider":
        return "Deliver";
      case "runner":
        return "Run";
      default:
        return "Go Online";
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-all flex items-center justify-center gap-2 ${
        isOnline
          ? "bg-red-600 hover:bg-red-700"
          : "bg-green-600 hover:bg-green-700"
      } ${isLoading ? "opacity-75 cursor-not-allowed" : ""}`}
    >
      {isLoading && <Loader2 size={18} className="animate-spin" />}
      <span>{isOnline ? "Go Offline" : getRoleLabel()}</span>
    </button>
  );
};

export default OnlineToggleButton;
