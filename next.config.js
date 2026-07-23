/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
