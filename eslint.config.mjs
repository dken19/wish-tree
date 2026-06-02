import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scripts/**",
  ]),
  // Three.js/R3F vốn imperative: random hóa vị trí trang trí trong useMemo và
  // mutate buffer trong useFrame là cố ý — tắt các rule React-Compiler báo nhầm.
  {
    files: ["components/three/**"],
    rules: {
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Đồng bộ state với hệ thống ngoài (media query, toast trigger, localStorage)
  // là pattern hợp lệ ở các component này.
  {
    files: ["components/ui/Toast.tsx", "app/admin/page.tsx"],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
]);

export default eslintConfig;
