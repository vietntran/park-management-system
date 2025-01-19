// src/components/ui/form/FormContainer.tsx
interface FormContainerProps {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const FormContainer = ({
  title,
  subtitle,
  children,
  footer,
  className = "",
}: FormContainerProps) => {
  return (
    <div className={`w-full max-w-md space-y-8 ${className}`}>
      <div>
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 text-center text-sm text-gray-600">{subtitle}</p>
        )}
      </div>

      {children}

      {footer && (
        <div className="mt-6 flex justify-center text-center text-sm text-gray-600">
          {footer}
        </div>
      )}
    </div>
  );
};
