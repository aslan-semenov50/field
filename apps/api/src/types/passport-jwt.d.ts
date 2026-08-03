declare module 'passport-jwt' {
  export const ExtractJwt: {
    fromAuthHeaderAsBearerToken(): any;
  };

  export class Strategy {
    constructor(options: any, verify?: any);
  }
}
