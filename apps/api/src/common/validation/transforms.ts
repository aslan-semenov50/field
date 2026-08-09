import type { TransformFnParams } from 'class-transformer';

export function trimString({ value }: TransformFnParams) {
  return typeof value === 'string' ? value.trim() : value;
}

export function upperTrimString({ value }: TransformFnParams) {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export function trimStringArray({ value }: TransformFnParams) {
  return Array.isArray(value)
    ? value.map((item) => (typeof item === 'string' ? item.trim() : item))
    : value;
}

export function upperTrimStringArray({ value }: TransformFnParams) {
  return Array.isArray(value)
    ? value.map((item) => (typeof item === 'string' ? item.trim().toUpperCase() : item))
    : value;
}
