const config = {
  apps: [
    {
      name: "ap-palmares",
      script: "npm",
      args: "start",
      env_production: {
        NODE_ENV: "production",
        NEXTAUTH_URL: "http://localhost:3000",
        NEXTAUTH_TRUST_HOSTS: "localhost",
      },
    },
  ],
};

export default config;
