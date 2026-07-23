/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  serverExternalPackages: ["@aws-sdk/client-sesv2"],
  async redirects() {
    return [
      {
        source: "/oneflow/exit-clearance/confirm/:taskId",
        destination: "/oneflow/tasks/:taskId",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
