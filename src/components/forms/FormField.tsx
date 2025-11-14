import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormBuilderField } from "./FormBuilder";
import {
  FormControl,
  FormDescription,
  FormField as ShadcnFormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

interface FormFieldProps {
  field: FormBuilderField;
  form: UseFormReturn<any>;
}

export const FormField: React.FC<FormFieldProps> = ({ field, form }) => {
  return (
    <ShadcnFormField
      control={form.control}
      name={field.name}
      render={({ field: formField }) => (
        <FormItem>
          <FormLabel>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>
            {(() => {
              switch (field.type) {
                case 'textarea':
                  return (
                    <Textarea
                      placeholder={field.placeholder}
                      disabled={field.disabled}
                      {...formField}
                    />
                  );

                case 'select':
                  return (
                    <Select
                      onValueChange={formField.onChange}
                      defaultValue={formField.value}
                      disabled={field.disabled}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((option) => (
                          <SelectItem key={option.value} value={String(option.value)}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );

                case 'checkbox':
                  return (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={formField.value}
                        onCheckedChange={formField.onChange}
                        disabled={field.disabled}
                      />
                      <label className="text-sm font-normal cursor-pointer">
                        {field.description || field.placeholder}
                      </label>
                    </div>
                  );

                case 'radio':
                  return (
                    <RadioGroup
                      onValueChange={formField.onChange}
                      defaultValue={formField.value}
                      disabled={field.disabled}
                    >
                      {field.options?.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <RadioGroupItem value={String(option.value)} />
                          <label className="text-sm font-normal cursor-pointer">
                            {option.label}
                          </label>
                        </div>
                      ))}
                    </RadioGroup>
                  );

                case 'switch':
                  return (
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formField.value}
                        onCheckedChange={formField.onChange}
                        disabled={field.disabled}
                      />
                      <label className="text-sm font-normal">
                        {field.description || field.placeholder}
                      </label>
                    </div>
                  );

                case 'file':
                  return (
                    <Input
                      type="file"
                      accept={field.accept}
                      multiple={field.multiple}
                      disabled={field.disabled}
                      onChange={(e) => {
                        const files = e.target.files;
                        formField.onChange(field.multiple ? Array.from(files || []) : files?.[0]);
                      }}
                    />
                  );

                case 'range':
                  return (
                    <div className="space-y-2">
                      <Slider
                        min={field.min}
                        max={field.max}
                        step={field.step || 1}
                        value={[formField.value || field.min || 0]}
                        onValueChange={(value) => formField.onChange(value[0])}
                        disabled={field.disabled}
                      />
                      <div className="text-sm text-muted-foreground text-center">
                        {formField.value || field.min || 0}
                      </div>
                    </div>
                  );

                case 'color':
                  return (
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        {...formField}
                        disabled={field.disabled}
                        className="w-20 h-10"
                      />
                      <Input
                        type="text"
                        value={formField.value}
                        onChange={formField.onChange}
                        disabled={field.disabled}
                        placeholder="#000000"
                      />
                    </div>
                  );

                case 'number':
                  return (
                    <Input
                      type="number"
                      placeholder={field.placeholder}
                      disabled={field.disabled}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      {...formField}
                      onChange={(e) => formField.onChange(e.target.valueAsNumber)}
                    />
                  );

                default:
                  return (
                    <Input
                      type={field.type}
                      placeholder={field.placeholder}
                      disabled={field.disabled}
                      {...formField}
                    />
                  );
              }
            })()}
          </FormControl>
          {field.description && field.type !== 'checkbox' && field.type !== 'switch' && (
            <FormDescription>{field.description}</FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
