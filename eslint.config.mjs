import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextVitals,
  {
    linterOptions: {
      reportUnusedDisableDirectives: "warn",
    },
    rules: {
      "react/no-unescaped-entities": "warn",
      // Legacy client panels still load remote data from effects. Keep this visible
      // without forcing a release-blocking refactor across hundreds of lines.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "coverage/**",
      "gateway/openwa/**",
    ],
  },
];

export default eslintConfig;
