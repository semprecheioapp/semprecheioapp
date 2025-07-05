import React from "react";
import { useResponsive } from "@/hooks/use-responsive";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ResponsiveFormProps {
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
  title?: string;
  description?: string;
}

export function ResponsiveForm({
  children,
  onSubmit,
  className = "",
  title,
  description
}: ResponsiveFormProps) {
  const { isMobile } = useResponsive();

  const FormWrapper = title ? Card : 'div';
  const ContentWrapper = title ? CardContent : 'div';

  return (
    <FormWrapper className={className}>
      {title && (
        <CardHeader className={`${isMobile ? 'p-4 pb-2' : 'p-6 pb-4'}`}>
          <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'}`}>
            {title}
          </CardTitle>
          {description && (
            <p className={`text-gray-600 ${isMobile ? 'text-sm' : 'text-base'}`}>
              {description}
            </p>
          )}
        </CardHeader>
      )}
      <ContentWrapper className={title ? (isMobile ? 'p-4 pt-0' : 'p-6 pt-0') : ''}>
        <form onSubmit={onSubmit} className={`space-y-${isMobile ? '4' : '6'}`}>
          {children}
        </form>
      </ContentWrapper>
    </FormWrapper>
  );
}

interface ResponsiveFormFieldProps {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  error?: string;
  description?: string;
  className?: string;
}

export function ResponsiveFormField({
  label,
  children,
  required = false,
  error,
  description,
  className = ""
}: ResponsiveFormFieldProps) {
  const { isMobile } = useResponsive();

  return (
    <div className={`space-y-${isMobile ? '1' : '2'} ${className}`}>
      <Label className={`${isMobile ? 'text-sm' : 'text-base'} font-medium`}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {description && (
        <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'}`}>
          {description}
        </p>
      )}
      {children}
      {error && (
        <p className={`text-red-500 ${isMobile ? 'text-xs' : 'text-sm'}`}>
          {error}
        </p>
      )}
    </div>
  );
}

interface ResponsiveInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  description?: string;
}

export function ResponsiveInput({
  label,
  error,
  description,
  className = "",
  ...props
}: ResponsiveInputProps) {
  const { isMobile } = useResponsive();

  const input = (
    <Input
      {...props}
      className={`${isMobile ? 'h-12 text-base' : 'h-10'} ${className}`}
    />
  );

  if (!label) return input;

  return (
    <ResponsiveFormField
      label={label}
      error={error}
      description={description}
      required={props.required}
    >
      {input}
    </ResponsiveFormField>
  );
}

interface ResponsiveTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  description?: string;
}

export function ResponsiveTextarea({
  label,
  error,
  description,
  className = "",
  ...props
}: ResponsiveTextareaProps) {
  const { isMobile } = useResponsive();

  const textarea = (
    <Textarea
      {...props}
      className={`${isMobile ? 'min-h-[100px] text-base' : 'min-h-[80px]'} ${className}`}
    />
  );

  if (!label) return textarea;

  return (
    <ResponsiveFormField
      label={label}
      error={error}
      description={description}
      required={props.required}
    >
      {textarea}
    </ResponsiveFormField>
  );
}

interface ResponsiveSelectProps {
  label?: string;
  error?: string;
  description?: string;
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  required?: boolean;
}

export function ResponsiveSelect({
  label,
  error,
  description,
  placeholder,
  value,
  onValueChange,
  children,
  required = false
}: ResponsiveSelectProps) {
  const { isMobile } = useResponsive();

  const select = (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={`${isMobile ? 'h-12 text-base' : 'h-10'}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {children}
      </SelectContent>
    </Select>
  );

  if (!label) return select;

  return (
    <ResponsiveFormField
      label={label}
      error={error}
      description={description}
      required={required}
    >
      {select}
    </ResponsiveFormField>
  );
}

interface ResponsiveButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  fullWidth?: boolean;
  loading?: boolean;
}

export function ResponsiveButton({
  children,
  variant = "default",
  size = "default",
  fullWidth = false,
  loading = false,
  className = "",
  disabled,
  ...props
}: ResponsiveButtonProps) {
  const { isMobile } = useResponsive();

  return (
    <Button
      {...props}
      variant={variant}
      size={isMobile ? "lg" : size}
      disabled={disabled || loading}
      className={`
        ${fullWidth ? 'w-full' : ''}
        ${isMobile ? 'h-12 text-base font-medium' : ''}
        ${className}
      `}
    >
      {loading && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
      )}
      {children}
    </Button>
  );
}

// Componente para grupos de botões responsivos
export function ResponsiveButtonGroup({
  children,
  orientation = "horizontal",
  className = ""
}: {
  children: React.ReactNode;
  orientation?: "horizontal" | "vertical";
  className?: string;
}) {
  const { isMobile } = useResponsive();

  const isVertical = orientation === "vertical" || isMobile;

  return (
    <div className={`
      flex ${isVertical ? 'flex-col space-y-2' : 'flex-row space-x-2'}
      ${isMobile ? 'w-full' : ''}
      ${className}
    `}>
      {children}
    </div>
  );
}
