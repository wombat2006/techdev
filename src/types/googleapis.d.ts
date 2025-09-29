/* eslint-disable @typescript-eslint/no-unused-vars, no-unused-vars */
declare module 'googleapis' {
  export const google: {
    drive: (options: any) => {
      files: {
        list: (params: any) => Promise<{ data: { files: any[] } }>;
        get: (params: any, options?: any) => Promise<{ data: any }>;
        export: (params: any) => Promise<{ data: any }>;
      };
      revisions: {
        list: (params: any) => Promise<{ data: { revisions: any[] } }>;
      };
      permissions: {
        list: (params: any) => Promise<{ data: { permissions: any[] } }>;
      };
    };
    auth: {
      OAuth2: new (...args: any[]) => {
        setCredentials: (credentials: any) => void;
        on: (event: string, handler: (...args: any[]) => void) => void;
      };
    };
  };
}
/* eslint-enable @typescript-eslint/no-unused-vars, no-unused-vars */
