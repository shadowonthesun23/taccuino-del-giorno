declare module 'dom-to-image-more' {
  interface Options {
    quality?: number;
    width?: number;
    height?: number;
    style?: Partial<CSSStyleDeclaration>;
    filter?: (node: Node) => boolean;
    bgcolor?: string;
    cacheBust?: boolean;
    imagePlaceholder?: string;
    scale?: number;
  }

  function toJpeg(node: HTMLElement, options?: Options): Promise<string>;
  function toPng(node: HTMLElement, options?: Options): Promise<string>;
  function toSvg(node: HTMLElement, options?: Options): Promise<string>;
  function toBlob(node: HTMLElement, options?: Options): Promise<Blob>;
  function toCanvas(node: HTMLElement, options?: Options): Promise<HTMLCanvasElement>;

  const domtoimage: {
    toJpeg: typeof toJpeg;
    toPng: typeof toPng;
    toSvg: typeof toSvg;
    toBlob: typeof toBlob;
    toCanvas: typeof toCanvas;
  };

  export default domtoimage;
  export { toJpeg, toPng, toSvg, toBlob, toCanvas };
}
