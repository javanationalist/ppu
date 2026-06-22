/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import { mockSupabase } from './mockSupabase';

const getEnvVar = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return (import.meta.env as any)[key] || '';
    }
  } catch (e) {}
  
  try {
    if (typeof process !== 'undefined' && process.env) {
      return (process.env as any)[key] || '';
    }
  } catch (e) {}
  
  return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || 'https://placeholder.supabase.co';
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || 'placeholder-key';

const isPlaceholder = (val: string): boolean => {
  const lower = val.toLowerCase();
  return (
    lower.includes('placeholder') ||
    lower.includes('your-project') ||
    lower.includes('your_') ||
    lower.includes('your-anon') ||
    lower.includes('xyzcompany') ||
    lower.includes('example.supabase') ||
    lower.includes('example.com') ||
    val.trim() === ''
  );
};

export const isSupabaseConfigured = 
  supabaseUrl !== 'https://placeholder.supabase.co' && 
  !isPlaceholder(supabaseUrl) &&
  supabaseAnonKey !== 'placeholder-key' && 
  !isPlaceholder(supabaseAnonKey);

export const realSupabase = createClient(supabaseUrl, supabaseAnonKey);

// Resilient fallback mechanism: if any query fails due to network/fetch issues, 
// automatically transition to locally mocked storage to prevent app crashes.
let useLocalMock = !isSupabaseConfigured;

const isObjectOrFunc = (val: any) => val !== null && (typeof val === 'object' || typeof val === 'function');

const makeSafeProxy = (realObj: any, mockObj: any, path: string[] = []): any => {
  if (!isObjectOrFunc(realObj) && !isObjectOrFunc(mockObj)) {
    return (isSupabaseConfigured && !useLocalMock)
      ? (realObj !== undefined ? realObj : mockObj)
      : (mockObj !== undefined ? mockObj : realObj);
  }

  const target = isObjectOrFunc(realObj) ? realObj : (isObjectOrFunc(mockObj) ? mockObj : {});

  return new Proxy(target, {
    get(target, prop, receiver) {
      // Return primitive properties of Proxy checks
      if (prop === '__isProxy') return true;
      if (
        typeof prop === 'symbol' || 
        prop === 'then' || 
        prop === 'toJSON' || 
        prop === 'prototype' ||
        prop === 'toString' ||
        prop === 'valueOf' ||
        prop === 'constructor' ||
        prop === 'toLocaleString' ||
        prop === 'hasOwnProperty' ||
        prop === 'isPrototypeOf' ||
        prop === 'propertyIsEnumerable'
      ) {
        const activeTarget = (isSupabaseConfigured && !useLocalMock) ? realObj : mockObj;
        if (isObjectOrFunc(activeTarget)) {
          const val = Reflect.get(activeTarget, prop);
          if (typeof val === 'function') {
            return val.bind(activeTarget);
          }
          return val;
        }
        return undefined;
      }

      const activeObj = (isSupabaseConfigured && !useLocalMock) ? realObj : mockObj;
      if (!isObjectOrFunc(activeObj)) return undefined;

      const val = Reflect.get(activeObj, prop);

      if (typeof val === 'function') {
        return function (...args: any[]) {
          if (!isSupabaseConfigured || useLocalMock) {
            const mockFunc = isObjectOrFunc(mockObj) ? Reflect.get(mockObj, prop) : null;
            if (typeof mockFunc === 'function') {
              return mockFunc.apply(mockObj, args);
            }
            return mockFunc;
          }

          try {
            const result = val.apply(activeObj, args);
            
            if (result instanceof Promise) {
              return result.catch((err: any) => {
                if (err && (
                  err.message?.includes('fetch') || 
                  err.message?.includes('Failed to fetch') || 
                  err.message?.includes('NetworkError') ||
                  err.status === 0 ||
                  err.code === 'TypeError'
                )) {
                  console.warn(`Supabase network connection issue detected on path [${path.concat(String(prop)).join('.')}] - fallback to Local Mock DB:`, err);
                  useLocalMock = true;
                  const mockFunc = isObjectOrFunc(mockObj) ? Reflect.get(mockObj, prop) : null;
                  if (typeof mockFunc === 'function') {
                    return mockFunc.apply(mockObj, args);
                  }
                  return mockFunc;
                }
                throw err;
              });
            }
            
            const nextMockVal = isObjectOrFunc(mockObj) 
              ? (typeof Reflect.get(mockObj, prop) === 'function' ? undefined : Reflect.get(mockObj, prop)) 
              : null;
            return makeSafeProxy(result, nextMockVal, path.concat(String(prop)));
          } catch (err: any) {
            if (err && (
              err.message?.includes('fetch') || 
              err.message?.includes('Failed to fetch') || 
              err.message?.includes('NetworkError') ||
              err.status === 0
            )) {
              console.warn(`Supabase network error during function invocation [${path.concat(String(prop)).join('.')}] - fallback to Local Mock DB:`, err);
              useLocalMock = true;
              const mockFunc = isObjectOrFunc(mockObj) ? Reflect.get(mockObj, prop) : null;
              if (typeof mockFunc === 'function') {
                return mockFunc.apply(mockObj, args);
              }
              return mockFunc;
            }
            throw err;
          }
        };
      }

      if (isObjectOrFunc(val)) {
        const nextMockVal = isObjectOrFunc(mockObj) ? Reflect.get(mockObj, prop) : null;
        return makeSafeProxy(val, nextMockVal, path.concat(String(prop)));
      }

      return val;
    }
  });
};

export const supabase = makeSafeProxy(realSupabase, mockSupabase, ['supabase']);

