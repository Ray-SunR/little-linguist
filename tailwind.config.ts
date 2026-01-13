import type { Config } from "tailwindcss";

const config: Config = {
	darkMode: ["class"],
	content: [
		"./app/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./hooks/**/*.{ts,tsx}",
	],
	theme: {
		extend: {
			fontFamily: {
				fredoka: ["var(--font-fredoka)", "sans-serif"],
				nunito: ["var(--font-nunito)", "sans-serif"],
			},
			colors: {
				shell: 'var(--shell)',
				card: {
					DEFAULT: 'var(--card)',
					foreground: 'hsl(var(--card-foreground))'
				},
				ink: 'var(--ink)',
				'ink-muted': 'var(--ink-muted)',
				cta: 'var(--cta)',
				'cta-ink': 'var(--cta-ink)',
				highlight: 'var(--highlight)',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'var(--accent)',
					foreground: 'hsl(var(--accent-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				chart: {
					'1': 'hsl(var(--chart-1))',
					'2': 'hsl(var(--chart-2))',
					'3': 'hsl(var(--chart-3))',
					'4': 'hsl(var(--chart-4))',
					'5': 'hsl(var(--chart-5))'
				}
			},
			boxShadow: {
				soft: 'var(--shadow)',
				clay: "0 12px 36px rgba(139, 75, 255, 0.15), 0 2px 4px rgba(139, 75, 255, 0.2)",
				"clay-inset": "inset 0 -12px 20px rgba(139, 75, 255, 0.15), inset 0 2px 6px rgba(255, 255, 255, 0.9)",
				"magic-glow": "0 0 50px rgba(139, 75, 255, 0.15)",
			},
			borderRadius: {
				card: 'var(--radius-card)',
				pill: 'var(--radius-pill)',
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
};

export default config;
