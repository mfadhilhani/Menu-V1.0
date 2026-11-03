/** @type {import('next').NextConfig} */
const nextConfig = {
  // ffmpeg-static berisi program ffmpeg: jangan dibundel, dan pastikan file programnya ikut ke fungsi /api/video (Vercel).
  serverExternalPackages: ["ffmpeg-static"],
  outputFileTracingIncludes: { "/api/video": ["./node_modules/ffmpeg-static/ffmpeg"] },
};
export default nextConfig;
