declare module 'expo-file-system' {
  export const EncodingType: any;
  export const cacheDirectory: string | null;
  export const documentDirectory: string | null;
  export function getContentUriAsync(...args: any[]): Promise<any>;
  export function readAsStringAsync(uri: string, options?: { encoding?: any }): Promise<string>;
  export function writeAsStringAsync(uri: string, contents: string, options?: { encoding?: any }): Promise<void>;
  const _default: any;
  export default _default;
}
