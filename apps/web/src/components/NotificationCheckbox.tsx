interface NotificationCheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void | Promise<void>;
  label?: string;
}

export function NotificationCheckbox({
  id,
  checked,
  onChange,
  label = "Email me when evaluations complete",
}: NotificationCheckboxProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => void onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <label htmlFor={id} className="text-sm text-gray-700">
        {label}
      </label>
    </div>
  );
}
