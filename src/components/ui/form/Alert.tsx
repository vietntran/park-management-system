// src/components/ui/form/Alert.tsx
interface AlertProps {
  variant?: "success" | "error" | "warning" | "info";
  title?: string;
  children: React.ReactNode;
}

const alertStyles = {
  success: "bg-green-50 text-green-700",
  error: "bg-red-50 text-red-700",
  warning: "bg-yellow-50 text-yellow-700",
  info: "bg-blue-50 text-blue-700",
};

export const Alert = ({ variant = "info", title, children }: AlertProps) => {
  return (
    <div className={`rounded-md p-4 ${alertStyles[variant]}`}>
      {title && <h3 className="text-sm font-medium mb-2">{title}</h3>}
      <div className="text-sm">{children}</div>
    </div>
  );
};
