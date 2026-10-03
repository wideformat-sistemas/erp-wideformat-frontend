/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'brand-dark': '#1e293b',
                'brand-primary': '#2563eb',
                'brand-accent': '#f59e0b',
            },
        },
    },
    plugins: [],
}