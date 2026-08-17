declare module 'express' {
  interface Request {
    user?: { sub: string };
    cookies?: Record<string, string | undefined>;
  }

  interface Response {
    cookie(name: string, value: string, options?: any): any;
    clearCookie(name: string, options?: any): any;
    redirect(status: number, path: string): any;
  }
}
