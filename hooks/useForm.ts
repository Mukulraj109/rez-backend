/**
 * useForm Hook
 * Custom hook that wraps React Hook Form with additional utilities
 */

import { useCallback, useMemo } from 'react';
import {
  useForm as useReactHookForm,
  UseFormProps,
  UseFormReturn,
  FieldValues,
  DefaultValues,
  Mode,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ZodSchema } from 'zod';

interface UseFormConfig<T extends FieldValues> extends Omit<UseFormProps<T>, 'resolver'> {
  schema?: ZodSchema;
  onSubmit?: (data: T) => void | Promise<void>;
  onError?: (errors: any) => void;
}

interface UseFormReturn<T extends FieldValues> extends UseFormReturn<T> {
  isValid: boolean;
  isDirty: boolean;
  submitForm: (data: T) => Promise<void>;
  resetForm: (data?: Partial<T>) => void;
  getFieldError: (fieldName: keyof T) => string | undefined;
  hasFieldError: (fieldName: keyof T) => boolean;
  clearFieldError: (fieldName: keyof T) => void;
  setFieldError: (fieldName: keyof T, error: string) => void;
}

/**
 * Custom form hook that provides additional utilities on top of React Hook Form
 */
export const useForm = <T extends FieldValues = any>({
  schema,
  onSubmit,
  onError,
  ...config
}: UseFormConfig<T>): UseFormReturn<T> => {
  // Initialize React Hook Form with schema validation
  const form = useReactHookForm<T>({
    resolver: schema ? zodResolver(schema) : undefined,
    mode: config.mode || 'onBlur',
    ...config,
  });

  const { handleSubmit, formState, watch, clearErrors, setError, reset } = form;
  const { errors, isValid, isDirty, isSubmitting } = formState;

  /**
   * Get error message for a specific field
   */
  const getFieldError = useCallback(
    (fieldName: keyof T): string | undefined => {
      const error = errors[fieldName as string];
      return error?.message as string | undefined;
    },
    [errors]
  );

  /**
   * Check if a field has an error
   */
  const hasFieldError = useCallback(
    (fieldName: keyof T): boolean => {
      return !!errors[fieldName as string];
    },
    [errors]
  );

  /**
   * Clear error for a specific field
   */
  const clearFieldError = useCallback(
    (fieldName: keyof T) => {
      clearErrors(fieldName as any);
    },
    [clearErrors]
  );

  /**
   * Set error for a specific field
   */
  const setFieldError = useCallback(
    (fieldName: keyof T, error: string) => {
      setError(fieldName as any, {
        type: 'manual',
        message: error,
      });
    },
    [setError]
  );

  /**
   * Handle form submission with error handling
   */
  const submitForm = useCallback(
    async (data: T) => {
      if (!isValid) {
        onError?.(errors);
        return;
      }

      try {
        await onSubmit?.(data);
      } catch (error) {
        onError?.(error);
      }
    },
    [isValid, errors, onSubmit, onError]
  );

  /**
   * Reset form to initial state or to specific data
   */
  const resetForm = useCallback(
    (data?: Partial<T>) => {
      reset(data as DefaultValues<T>);
    },
    [reset]
  );

  /**
   * Memoized return object to prevent unnecessary re-renders
   */
  const extendedForm = useMemo(
    () => ({
      ...form,
      isValid,
      isDirty,
      isSubmitting,
      submitForm,
      resetForm,
      getFieldError,
      hasFieldError,
      clearFieldError,
      setFieldError,
    }),
    [
      form,
      isValid,
      isDirty,
      isSubmitting,
      submitForm,
      resetForm,
      getFieldError,
      hasFieldError,
      clearFieldError,
      setFieldError,
    ]
  );

  return extendedForm as UseFormReturn<T>;
};

/**
 * Hook for handling multi-step forms
 */
export const useMultiStepForm = <T extends FieldValues>(
  schema: ZodSchema,
  onSubmit?: (data: T) => void | Promise<void>
) => {
  const form = useForm({ schema, onSubmit });
  const [currentStep, setCurrentStep] = ('useState' as any)(0);

  const nextStep = useCallback(() => {
    setCurrentStep((prev: number) => prev + 1);
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((prev: number) => Math.max(0, prev - 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  return {
    ...form,
    currentStep,
    nextStep,
    prevStep,
    goToStep,
  };
};

/**
 * Hook for form validation utilities
 */
export const useFormValidation = () => {
  /**
   * Validate form data against schema
   */
  const validateData = useCallback(async (data: any, schema: ZodSchema) => {
    try {
      const result = await schema.parseAsync(data);
      return { valid: true, data: result, errors: null };
    } catch (error: any) {
      return { valid: false, data: null, errors: error.errors || error };
    }
  }, []);

  /**
   * Validate single field
   */
  const validateField = useCallback(async (fieldName: string, value: any, schema: ZodSchema) => {
    try {
      const result = await schema.pick({ [fieldName]: true }).parseAsync({ [fieldName]: value });
      return { valid: true, error: null };
    } catch (error: any) {
      const fieldError = error.errors?.[0]?.message || error.message;
      return { valid: false, error: fieldError };
    }
  }, []);

  return {
    validateData,
    validateField,
  };
};

/**
 * Hook for async form submission
 */
export const useAsyncFormSubmit = <T extends FieldValues>(
  onSubmit: (data: T) => Promise<void>
) => {
  const form = useForm({ onSubmit });
  const { handleSubmit } = form;

  const submitAsync = useCallback(
    async (data: T) => {
      try {
        await onSubmit(data);
      } catch (error) {
        form.setFieldError('submit' as any, error instanceof Error ? error.message : 'Submission failed');
      }
    },
    [onSubmit, form]
  );

  return {
    ...form,
    onSubmit: handleSubmit(submitAsync),
  };
};

/**
 * Hook for form state persistence
 */
export const useFormPersistence = <T extends FieldValues>(
  key: string,
  schema?: ZodSchema
) => {
  // Note: In React Native, use AsyncStorage instead
  const form = useForm({ schema });
  const { watch, reset } = form;
  const values = watch();

  // Persist form data (implementation depends on platform)
  const persistData = useCallback(async (data: T) => {
    try {
      // This would use AsyncStorage in React Native
      localStorage?.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to persist form data:', error);
    }
  }, [key]);

  // Restore form data
  const restoreData = useCallback(async () => {
    try {
      // This would use AsyncStorage in React Native
      const saved = localStorage?.getItem(key);
      if (saved) {
        const data = JSON.parse(saved);
        reset(data);
        return data;
      }
    } catch (error) {
      console.error('Failed to restore form data:', error);
    }
  }, [key, reset]);

  // Clear persisted data
  const clearData = useCallback(() => {
    try {
      localStorage?.removeItem(key);
      reset();
    } catch (error) {
      console.error('Failed to clear form data:', error);
    }
  }, [key, reset]);

  return {
    ...form,
    persistData,
    restoreData,
    clearData,
  };
};

export default useForm;
