"use client";

import { useEffect, useRef } from "react";
import { hasFieldErrors, type FieldErrors } from "@/lib/ui/validation";

/** Reveal invalid fields even inside collapsed sections, then move focus to correction. */
export function useValidationFocus<Field extends string, Element extends HTMLElement = HTMLFormElement>(errors: FieldErrors<Field>) {
  const formRef = useRef<Element>(null);
  const previous = useRef(errors);
  useEffect(() => {
    const prior = previous.current;
    previous.current = errors;
    const onlyClearing = Object.entries(errors).every(([key, value]) => !value || value === prior[key as Field])
      && Object.entries(prior).some(([key, value]) => value && !errors[key as Field]);
    // Removing a field error while typing must never jump to another field.
    if (onlyClearing) return;
    if (!hasFieldErrors(errors)) return;
    const control = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]:not([disabled])');
    let parent: HTMLElement | null = control?.parentElement ?? null;
    while (parent) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
      parent = parent.parentElement;
    }
    control?.focus();
  }, [errors]);
  return formRef;
}
