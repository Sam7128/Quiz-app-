import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import pluginSecurity from "eslint-plugin-security";
import tseslint from "typescript-eslint";

export default tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    pluginSecurity.configs.recommended,
    {
        plugins: {
            "react-hooks": reactHooks,
        },
        rules: {
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",
        }
    },
    {
        rules: {
            "security/detect-object-injection": "off",
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_", "caughtErrorsIgnorePattern": "^_" }],
            "prefer-const": "warn",
        }
    },
    {
        ignores: ["dist", "node_modules", "test-results"]
    }
);
