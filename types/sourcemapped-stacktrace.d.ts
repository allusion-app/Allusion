
declare module 'sourcemapped-stacktrace' {
  export function mapStackTrace(stack: string | undefined, cb: (sourceMappedStack: string[]) => any, opts?: any): void;
}
