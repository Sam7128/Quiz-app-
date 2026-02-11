import js from "@eslint/js";
import pluginSecurity from "eslint-plugin-security";
import tseslint from "typescript-eslint";

export default tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    pluginSecurity.configs.recommended,
    {
        rules: {
            "security/detect-object-injection": "off",
            "@typescript-eslint/no-explicit-any": "warn",
        }
    },
    {
        ignores: ["dist", "node_modules", "test-results"]
    }
);
