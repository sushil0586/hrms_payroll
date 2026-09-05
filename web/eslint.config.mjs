import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: [
      ".next/**",
      "playwright-report/**",
      "playwright-live-report/**",
      "test-results/**",
    ],
  },
  ...nextVitals,
];

export default config;
