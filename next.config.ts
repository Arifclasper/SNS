import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mongoose/libmongodb, Cloudinary and PDFKit ship Node-only code (native
  // bindings / dynamic requires), so keep them outside the server bundle.
  serverExternalPackages: ["mongoose", "mongodb", "cloudinary", "pdfkit"],
  // The receipt route reads these at runtime. Without this, Vercel's file
  // tracing can leave them out of the serverless bundle.
  outputFileTracingIncludes: {
    "/api/orders/**": [
      "./assets/fonts/**",
      // PDFKit resolves its built-in fonts through dynamic subpath imports
      // (`#standard-fonts/*`), which nft does not trace automatically. Without
      // these the receipt route fails on Vercel when it constructs a document.
      "./node_modules/pdfkit/js/standard-fonts/**",
      "./node_modules/pdfkit/js/data/**",
    ],
    "/api/admin/orders/**": [
      "./assets/fonts/**",
      "./node_modules/pdfkit/js/standard-fonts/**",
      "./node_modules/pdfkit/js/data/**",
    ],
  },
};

export default nextConfig;
