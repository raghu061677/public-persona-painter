import * as React from "react";
import { useForm, FormProvider, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export interface FormBuilderField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'date' | 'time' | 'datetime-local' | 
        'textarea' | 'select' | 'checkbox' | 'radio' | 'switch' | 'file' | 'color' | 'range' | 'custom';
  placeholder?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  options?: Array<{ label: string; value: string | number }>;
  validation?: z.ZodTypeAny;
  defaultValue?: any;
  customRender?: (form: UseFormReturn<any>) => React.ReactNode;
  colSpan?: 1 | 2 | 3 | 4 | 6 | 12;
  min?: number;
  max?: number;
  step?: number;
  accept?: string;
  multiple?: boolean;
}

export interface FormBuilderSection {
  title?: string;
  description?: string;
  fields: FormBuilderField[];
}

export interface FormBuilderProps {
  sections: FormBuilderSection[];
  onSubmit: (data: any) => void | Promise<void>;
  defaultValues?: Record<string, any>;
  className?: string;
  layout?: 'single' | 'two-column' | 'grid';
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  loading?: boolean;
  showCard?: boolean;
  cardTitle?: string;
  cardDescription?: string;
}

/**
 * FormBuilder - A comprehensive form builder component with validation
 * 
 * @example
 * ```tsx
 * const formSections = [
 *   {
 *     title: "Personal Info",
 *     fields: [
 *       { name: "name", label: "Name", type: "text", required: true },
 *       { name: "email", label: "Email", type: "email", required: true }
 *     ]
 *   }
 * ];
 * 
 * <FormBuilder
 *   sections={formSections}
 *   onSubmit={(data) => console.log(data)}
 *   layout="two-column"
 * />
 * ```
 */
export const FormBuilder = React.forwardRef<HTMLFormElement, FormBuilderProps>(
  (
    {
      sections,
      onSubmit,
      defaultValues = {},
      className,
      layout = 'single',
      submitLabel = 'Submit',
      cancelLabel = 'Cancel',
      onCancel,
      loading = false,
      showCard = true,
      cardTitle,
      cardDescription,
    },
    ref
  ) => {
    // Build Zod schema from fields
    const schema = React.useMemo(() => {
      const schemaFields: Record<string, z.ZodTypeAny> = {};
      
      sections.forEach(section => {
        section.fields.forEach(field => {
          if (field.validation) {
            schemaFields[field.name] = field.validation;
          } else {
            // Auto-generate validation based on field type
            let fieldSchema: z.ZodTypeAny = z.string();
            
            switch (field.type) {
              case 'email':
                fieldSchema = z.string().email("Invalid email address");
                break;
              case 'url':
                fieldSchema = z.string().url("Invalid URL");
                break;
              case 'number':
              case 'range':
                fieldSchema = z.number();
                if (field.min !== undefined) fieldSchema = (fieldSchema as z.ZodNumber).min(field.min);
                if (field.max !== undefined) fieldSchema = (fieldSchema as z.ZodNumber).max(field.max);
                break;
              case 'checkbox':
              case 'switch':
                fieldSchema = z.boolean();
                break;
              case 'file':
                fieldSchema = field.multiple ? z.array(z.any()) : z.any();
                break;
              default:
                fieldSchema = z.string();
            }
            
            if (field.required) {
              if (field.type === 'checkbox' || field.type === 'switch') {
                fieldSchema = (fieldSchema as z.ZodBoolean).refine(val => val === true, {
                  message: `${field.label} is required`,
                });
              } else {
                fieldSchema = (fieldSchema as z.ZodString).min(1, `${field.label} is required`);
              }
            } else {
              fieldSchema = fieldSchema.optional();
            }
            
            schemaFields[field.name] = fieldSchema;
          }
        });
      });
      
      return z.object(schemaFields);
    }, [sections]);

    const form = useForm({
      resolver: zodResolver(schema),
      defaultValues,
    });

    const handleSubmit = async (data: any) => {
      try {
        await onSubmit(data);
      } catch (error) {
        console.error('Form submission error:', error);
      }
    };

    const gridColsClass = layout === 'two-column' ? 'md:grid-cols-2' : layout === 'grid' ? 'md:grid-cols-12' : '';

    const FormContent = (
      <FormProvider {...form}>
        <form 
          ref={ref}
          onSubmit={form.handleSubmit(handleSubmit)}
          className={cn("space-y-6", className)}
        >
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="space-y-4">
              {section.title && (
                <div>
                  <h3 className="text-lg font-semibold">{section.title}</h3>
                  {section.description && (
                    <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
                  )}
                </div>
              )}
              <div className={cn("grid gap-4", gridColsClass)}>
                {section.fields.map((field) => {
                  const colSpanClass = field.colSpan 
                    ? `md:col-span-${field.colSpan}` 
                    : layout === 'grid' ? 'md:col-span-6' : '';
                  
                  return (
                    <div key={field.name} className={cn(colSpanClass)}>
                      {field.type === 'custom' && field.customRender ? (
                        field.customRender(form)
                      ) : (
                        <FormField field={field} form={form} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex gap-2 justify-end pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                {cancelLabel}
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {submitLabel}
            </Button>
          </div>
        </form>
      </FormProvider>
    );

    if (showCard) {
      return (
        <Card>
          {(cardTitle || cardDescription) && (
            <CardHeader>
              {cardTitle && <CardTitle>{cardTitle}</CardTitle>}
              {cardDescription && <CardDescription>{cardDescription}</CardDescription>}
            </CardHeader>
          )}
          <CardContent>{FormContent}</CardContent>
        </Card>
      );
    }

    return FormContent;
  }
);

FormBuilder.displayName = "FormBuilder";

// FormField component (to be imported from separate file)
import { FormField } from "./FormField";
