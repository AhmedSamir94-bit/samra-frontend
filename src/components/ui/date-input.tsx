import * as React from "react";
import { format, parseISO, isValid } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DateInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

function parseDateValue(value: string) {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
}

const DateInput = React.forwardRef<HTMLButtonElement, DateInputProps>(
  (
    {
      id,
      value,
      onChange,
      placeholder = "اختر التاريخ",
      required,
      disabled,
      className,
    },
    ref
  ) => {
    const selectedDate = parseDateValue(value);

    return (
      <div className="relative w-full">
        {required && (
          <input
            tabIndex={-1}
            aria-hidden
            value={value}
            required={required}
            onChange={() => undefined}
            className="pointer-events-none absolute opacity-0 w-0 h-0"
          />
        )}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              ref={ref}
              id={id}
              type="button"
              variant="outline"
              disabled={disabled}
              dir="rtl"
              className={cn(
                "relative w-full h-10 justify-start pr-3 pl-10 text-right font-normal",
                !value && "text-muted-foreground",
                className
              )}
            >
              {selectedDate ? format(selectedDate, "dd/MM/yyyy") : placeholder}
              <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 shrink-0 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end" dir="rtl">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => onChange(date ? format(date, "yyyy-MM-dd") : "")}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }
);

DateInput.displayName = "DateInput";

export { DateInput };
