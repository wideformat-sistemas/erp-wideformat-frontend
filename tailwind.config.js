/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    dark: '#1e293b',
                    primary: '#2563eb',
                    accent: '#f59e0b'
                }
            }
        },
    },
    plugins: [],
}