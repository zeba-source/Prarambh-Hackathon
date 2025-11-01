import { Badge } from "@/components/ui/badge";
import { IssueStatus } from "@/types/report";

interface StatusBadgeProps {
  status: IssueStatus;
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const getStatusStyles = () => {
    switch (status) {
      case "pending":
        return "bg-pending text-pending-foreground hover:bg-pending/90";
      case "in-progress":
        return "bg-in-progress text-in-progress-foreground hover:bg-in-progress/90";
      case "resolved":
        return "bg-resolved text-resolved-foreground hover:bg-resolved/90";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "pending":
        return "Pending";
      case "in-progress":
        return "In Progress";
      case "resolved":
        return "Resolved";
    }
  };

  return (
    <Badge variant="secondary" className={getStatusStyles()}>
      {getStatusText()}
    </Badge>
  );
};

export default StatusBadge;
