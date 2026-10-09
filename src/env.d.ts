interface Window {
  fbq?: (...args: unknown[]) => void;
  gtag?: (...args: unknown[]) => void;
}

declare namespace App {
  interface Locals {
    /** URLs de Cloudinary cargadas desde /admin, por nombre de imagen. */
    images: Record<string, string>;
  }
}
