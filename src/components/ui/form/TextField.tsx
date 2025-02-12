// src/components/ui/form/TextField.tsx

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  description?: string;
  className?: string;
}

export function TextField({
  label,
  error,
  description,
  className = "",
  ...props
}: TextFieldProps) {
  const id = props.id || props.name;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 ">
        {label}
      </label>
      <input
        id={id}
        className={`
          relative block w-full rounded-md border-0 py-1.5 px-3 
          text-gray-900 ring-1 ring-inset ring-gray-300 
          placeholder:text-gray-400 
          focus:ring-2 focus:ring-inset focus:ring-blue-600 
          disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 
          sm:text-sm sm:leading-6
          ${error ? "ring-red-300" : ""}
          ${className}
        `}
        {...props}
      />
      {description && <p className="text-sm text-gray-500">{description}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
