export type FieldErrors<FieldName extends string> = Partial<Record<FieldName, string>>;

export type ValidationResult<FieldName extends string> = {
  fieldErrors: FieldErrors<FieldName>;
  formError?: string;
};

export type UploadFileLike = {
  name: string;
  size: number;
  type: string;
};

const blockedFileExtensions = new Set([
  "app",
  "bat",
  "cmd",
  "com",
  "cpl",
  "dll",
  "dmg",
  "exe",
  "gadget",
  "hta",
  "jar",
  "js",
  "jse",
  "lnk",
  "msi",
  "msp",
  "pif",
  "ps1",
  "scr",
  "sh",
  "vb",
  "vbe",
  "vbs",
  "wsf",
]);

const blockedMimeTypes = new Set([
  "application/java-archive",
  "application/javascript",
  "application/x-bat",
  "application/x-dosexec",
  "application/x-msdownload",
  "application/x-ms-installer",
  "application/x-msi",
  "application/x-sh",
  "application/x-shellscript",
  "text/javascript",
]);

export function hasFieldErrors<FieldName extends string>(fieldErrors: FieldErrors<FieldName>) {
  return Object.values(fieldErrors).some(Boolean);
}

export function requireText(value: string | null | undefined, message: string) {
  return value?.trim() ? undefined : message;
}

export function requireValue(value: string | number | boolean | null | undefined, message: string) {
  return value === null || value === undefined || value === "" ? message : undefined;
}

export function validateEmail(value: string, message = "Enter a valid email address.") {
  if (!value.trim()) return undefined;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? undefined : message;
}

export function validateEmployeeCode(value: string, message = "Use letters, numbers, periods, underscores, slashes, or hyphens only.") {
  if (!value.trim()) return undefined;
  return /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(value.trim()) ? undefined : message;
}

export function validatePhoneNumber(value: string, message = "Enter a valid phone number containing 7 to 15 digits.") {
  if (!value.trim()) return undefined;
  const normalized = value.trim();
  const digitCount = (normalized.match(/\d/g) ?? []).length;
  return /^[+()\- 0-9]+$/.test(normalized) && digitCount >= 7 && digitCount <= 15 ? undefined : message;
}

export function validateDateNotFuture(value: string | null | undefined, message: string, today = currentDateInputValue()) {
  return value && value > today ? message : undefined;
}

export function validateDateNotPast(value: string | null | undefined, message: string, today = currentDateInputValue()) {
  return value && value < today ? message : undefined;
}

export function validateDateOrder(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  message: string,
) {
  return startDate && endDate && endDate < startDate ? message : undefined;
}

export function fileExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return extension === fileName.toLowerCase() ? "" : extension;
}

export function isBlockedUploadFile(file: UploadFileLike) {
  return blockedFileExtensions.has(fileExtension(file.name)) || blockedMimeTypes.has(file.type.toLowerCase());
}

export function validateUploadFile(
  file: UploadFileLike | null | undefined,
  options: {
    blockedTypeMessage?: string;
    maxSizeBytes?: number;
    maxSizeMessage?: string;
    requiredMessage?: string;
  },
) {
  if (!file) return options.requiredMessage;
  if (options.maxSizeBytes !== undefined && file.size > options.maxSizeBytes) return options.maxSizeMessage;
  if (isBlockedUploadFile(file)) return options.blockedTypeMessage;
  return undefined;
}

function currentDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}
