/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      },
      {
        protocol: "https",
        hostname: "i.ebayimg.com"
      },
      {
        protocol: "https",
        hostname: "ir.ebaystatic.com"
      }
    ]
  }
};

export default nextConfig;
